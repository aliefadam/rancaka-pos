<?php

namespace App\Http\Controllers\Tenant\Reports;

use App\Enums\PaymentMethod;
use App\Enums\TransactionStatus;
use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Services\TransactionVoidService;
use Carbon\Carbon;
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
        $legacyDate = $request->string('date')->toString();
        $dateFrom = $limitedToOwnToday
            ? now()->toDateString()
            : ($request->string('date_from')->toString() ?: $legacyDate);
        $dateTo = $limitedToOwnToday
            ? now()->toDateString()
            : ($request->string('date_to')->toString() ?: $legacyDate);
        $dateFrom = $this->normalizedDate($dateFrom);
        $dateTo = $this->normalizedDate($dateTo);
        $status = $request->string('status')->toString();
        $paymentMethod = $request->string('payment_method')->toString();

        if (! in_array($paymentMethod, array_column(PaymentMethod::cases(), 'value'), true)) {
            $paymentMethod = '';
        }

        $filteredTransactions = Transaction::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->whereIn('status', [TransactionStatus::Completed, TransactionStatus::Voided])
            ->when($limitedToOwnToday, fn ($query) => $query
                ->where('user_id', $request->user()->id)
                ->where('created_at', '>=', now()->startOfDay())
                ->where('created_at', '<', now()->addDay()->startOfDay()))
            ->when($search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('invoice_number', 'like', "%{$search}%")
                        ->orWhereHas('user', fn ($q) => $q->where('name', 'like', "%{$search}%"));
                });
            })
            ->when($dateFrom, fn ($query, $date) => $query->where('created_at', '>=', Carbon::parse($date)->startOfDay()))
            ->when($dateTo, fn ($query, $date) => $query->where('created_at', '<', Carbon::parse($date)->addDay()->startOfDay()))
            ->when($status, fn ($query, $status) => $query->where('status', $status))
            ->when($paymentMethod, fn ($query, $method) => $query->where('payment_method', $method));

        $totalsByMethod = (clone $filteredTransactions)
            ->toBase()
            ->selectRaw('payment_method, COUNT(*) as transaction_count, COALESCE(SUM(total), 0) as total_amount')
            ->groupBy('payment_method')
            ->get()
            ->keyBy('payment_method');

        $paymentSummary = collect(PaymentMethod::cases())->map(function (PaymentMethod $method) use ($totalsByMethod): array {
            $total = $totalsByMethod->get($method->value);

            return [
                'method' => $method->value,
                'transaction_count' => (int) ($total->transaction_count ?? 0),
                'total_amount' => (int) ($total->total_amount ?? 0),
            ];
        })->values();

        $transactions = (clone $filteredTransactions)
            ->with(['user:id,name', 'shift.user:id,name', 'items', 'creditSale.customer:id,name', 'voider:id,name'])
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
            'paymentSummary' => $paymentSummary,
            'filters' => [
                'search' => $search,
                'date' => $dateFrom === $dateTo ? $dateFrom : '',
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'status' => $status,
                'payment_method' => $paymentMethod,
            ],
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

    private function normalizedDate(string $date): string
    {
        if (! preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $date, $matches)) {
            return '';
        }

        return checkdate((int) $matches[2], (int) $matches[3], (int) $matches[1]) ? $date : '';
    }
}
