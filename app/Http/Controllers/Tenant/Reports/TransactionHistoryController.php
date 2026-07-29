<?php

namespace App\Http\Controllers\Tenant\Reports;

use App\Enums\StockMovementType;
use App\Enums\TransactionStatus;
use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Services\StockMovementService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
            ->with(['user:id,name', 'items'])
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

        return Inertia::render('Tenant/Reports/Transactions/Index', [
            'transactions' => $transactions,
            'tenant' => $request->user()->tenant->only(['name', 'address', 'phone']),
            'filters' => ['search' => $search, 'date' => $date, 'status' => $status],
        ]);
    }

    public function void(Request $request, Transaction $transaction): RedirectResponse
    {
        abort_unless($transaction->tenant_id === $request->user()->tenant_id, 403);
        abort_unless($transaction->status === TransactionStatus::Completed, 403);

        $transaction->load('items.product');

        foreach ($transaction->items as $item) {
            if ($item->product && $item->product->track_stock) {
                StockMovementService::record(
                    $item->product,
                    StockMovementType::Adjustment,
                    $item->quantity,
                    "Pembatalan transaksi {$transaction->invoice_number}",
                    $request->user()->id,
                );
            }
        }

        $transaction->update(['status' => TransactionStatus::Voided]);

        return redirect()->route('tenant.reports.transactions.index')->with('success', 'Transaksi dibatalkan.');
    }
}
