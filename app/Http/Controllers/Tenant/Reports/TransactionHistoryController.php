<?php

namespace App\Http\Controllers\Tenant\Reports;

use App\Enums\TransactionStatus;
use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Services\TransactionVoidService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TransactionHistoryController extends Controller
{
    public function index(Request $request): Response
    {
        $limitedToOwnToday = $request->user()->hasRestrictedCashierAccess();
        $search = $request->string('search')->toString();
        $date = $limitedToOwnToday
            ? now()->toDateString()
            : $request->string('date')->toString();
        $status = $request->string('status')->toString();

        $transactions = Transaction::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->whereIn('status', [TransactionStatus::Completed, TransactionStatus::Voided])
            ->when($limitedToOwnToday, fn ($query) => $query
                ->where('user_id', $request->user()->id)
                ->where('created_at', '>=', now()->startOfDay())
                ->where('created_at', '<', now()->addDay()->startOfDay()))
            ->with(['user:id,name', 'shift.user:id,name', 'items', 'creditSale.customer:id,name', 'voider:id,name'])
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
            'limitedToOwnToday' => $limitedToOwnToday,
        ]);
    }

    public function void(Request $request, Transaction $transaction, TransactionVoidService $voidService): RedirectResponse
    {
        abort_unless($transaction->tenant_id === $request->user()->tenant_id, 403);
        $data = $this->validatedVoid($request);
        $voidService->voidMany($request->user(), [$transaction->id], $data['reason']);

        return redirect()->route('tenant.reports.transactions.index')->with('success', 'Transaksi dibatalkan.');
    }

    public function bulkVoid(Request $request, TransactionVoidService $voidService): RedirectResponse
    {
        $data = $this->validatedVoid($request, true);
        $count = $voidService->voidMany($request->user(), $data['ids'], $data['reason']);

        return back()->with('success', "{$count} transaksi berhasil dibatalkan.");
    }

    private function validatedVoid(Request $request, bool $bulk = false): array
    {
        return $request->validate([
            'password' => ['required', 'current_password'],
            'reason' => ['required', 'string', 'max:500'],
            'ids' => [$bulk ? 'required' : 'nullable', 'array', 'min:1', 'max:100'],
            'ids.*' => ['integer', 'distinct'],
        ], [
            'password.current_password' => 'Password yang Anda masukkan tidak sesuai.',
            'reason.required' => 'Alasan pembatalan wajib diisi.',
        ]);
    }
}
