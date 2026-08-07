<?php

namespace App\Http\Controllers\Tenant\Reports;

use App\Enums\StockMovementType;
use App\Enums\TransactionStatus;
use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Services\StockMovementService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TransactionHistoryController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $date = $request->string('date')->toString();
        $status = $request->string('status')->toString();

        $transactions = Transaction::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->whereIn('status', [TransactionStatus::Completed, TransactionStatus::Voided])
            ->with(['user:id,name', 'shift.user:id,name', 'items'])
            ->when($search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('invoice_number', 'like', "%{$search}%")
                        ->orWhereHas('user', fn ($q) => $q->where('name', 'like', "%{$search}%"));
                });
            })
            ->when($date, fn ($query, $date) => $query->whereDate('created_at', $date))
            ->when($status, fn ($query, $status) => $query->where('status', $status))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        $isOwner = $request->user()->isOwner();
        $voidDeadline = now()->subDay();

        $transactions->getCollection()->each(function (Transaction $transaction) use ($isOwner, $voidDeadline) {
            $transaction->setAttribute(
                'can_be_voided',
                $transaction->status === TransactionStatus::Completed
                    && ($isOwner || $transaction->created_at->greaterThanOrEqualTo($voidDeadline)),
            );
        });

        return Inertia::render('Tenant/Reports/Transactions/Index', [
            'transactions' => $transactions,
            'filters' => ['search' => $search, 'date' => $date, 'status' => $status],
        ]);
    }

    public function void(Request $request, Transaction $transaction): RedirectResponse
    {
        abort_unless($transaction->tenant_id === $request->user()->tenant_id, 403);

        DB::transaction(function () use ($request, $transaction) {
            $transaction = Transaction::query()
                ->where('tenant_id', $request->user()->tenant_id)
                ->lockForUpdate()
                ->findOrFail($transaction->id);

            abort_unless($transaction->status === TransactionStatus::Completed, 403);

            if (! $request->user()->isOwner() && $transaction->created_at->lt(now()->subDay())) {
                throw ValidationException::withMessages([
                    'transaction' => 'Transaksi hanya dapat dibatalkan maksimal 1x24 jam. Hubungi owner untuk pembatalan setelah batas waktu.',
                ]);
            }

            $transaction->load(['user:id,name', 'shift.user:id,name', 'items.product.rawMaterials']);
            $cashierName = $transaction->user?->name ?? $transaction->shift?->user?->name ?? '-';
            $note = "Pembatalan transaksi {$transaction->invoice_number} (Kasir: {$cashierName})";

            foreach ($transaction->items as $item) {
                if (! $item->product) {
                    continue;
                }

                if ($item->product->track_stock) {
                    StockMovementService::record(
                        $item->product,
                        StockMovementType::Adjustment,
                        $item->quantity,
                        $note,
                        $request->user()->id,
                    );
                }

                foreach ($item->product->rawMaterials as $rawMaterial) {
                    StockMovementService::record(
                        $rawMaterial,
                        StockMovementType::Adjustment,
                        $rawMaterial->pivot->quantity * $item->quantity,
                        $note,
                        $request->user()->id,
                    );
                }
            }

            $transaction->update(['status' => TransactionStatus::Voided]);
        });

        return redirect()->route('tenant.reports.transactions.index')->with('success', 'Transaksi dibatalkan.');
    }
}
