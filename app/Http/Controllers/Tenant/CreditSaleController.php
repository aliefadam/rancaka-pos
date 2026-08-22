<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\CreditPayment;
use App\Models\CreditSale;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CreditSaleController extends Controller
{
    public function index(Request $request): Response
    {
        $tenantId = $request->user()->tenant_id;
        $query = CreditSale::where('tenant_id', $tenantId)
            ->with(['customer:id,name', 'transaction:id,invoice_number,total,created_at']);
        if ($search = trim((string) $request->input('search'))) {
            $query->where(fn ($q) => $q->whereHas('customer', fn ($c) => $c->where('name', 'like', "%{$search}%"))
                ->orWhereHas('transaction', fn ($t) => $t->where('invoice_number', 'like', "%{$search}%")));
        }
        if (in_array($request->input('status'), ['outstanding', 'paid'], true)) {
            $query->where('status', $request->input('status'));
        }

        $filteredOutstanding = (clone $query)->where('status', 'outstanding');
        $outstandingTotal = (int) (clone $filteredOutstanding)
            ->selectRaw('COALESCE(SUM(total_amount - paid_amount), 0) AS total')
            ->value('total');
        $outstandingCustomers = (clone $filteredOutstanding)
            ->distinct()
            ->count('credit_customer_id');

        return Inertia::render('Tenant/CreditSales/Index', [
            'creditSales' => $query->latest()->paginate(15)->withQueryString(),
            'filters' => $request->only('search', 'status'),
            'summary' => [
                'outstanding' => $outstandingTotal,
                'customers' => $outstandingCustomers,
            ],
        ]);
    }

    public function show(Request $request, CreditSale $creditSale): Response
    {
        abort_unless($creditSale->tenant_id === $request->user()->tenant_id, 403);

        return Inertia::render('Tenant/CreditSales/Show', ['creditSale' => $creditSale->load([
            'customer:id,name', 'transaction.items', 'transaction.user:id,name', 'payments.user:id,name',
        ])]);
    }

    public function pay(Request $request, CreditSale $creditSale): RedirectResponse
    {
        abort_unless($creditSale->tenant_id === $request->user()->tenant_id, 403);
        $data = $request->validate(['amount' => ['required', 'integer', 'min:1'], 'note' => ['nullable', 'string', 'max:255']]);
        $payment = DB::transaction(function () use ($creditSale, $data, $request) {
            $sale = CreditSale::lockForUpdate()->findOrFail($creditSale->id);
            $remaining = $sale->total_amount - $sale->paid_amount;
            if ($sale->status === 'paid' || $data['amount'] > $remaining) {
                throw ValidationException::withMessages(['amount' => 'Nominal melebihi sisa hutang.']);
            }
            $payment = $sale->payments()->create(['tenant_id' => $sale->tenant_id, 'user_id' => $request->user()->id, 'amount' => $data['amount'], 'note' => $data['note'] ?? null]);
            $sale->paid_amount += $data['amount'];
            $sale->status = $sale->paid_amount >= $sale->total_amount ? 'paid' : 'outstanding';
            $sale->save();

            return $payment;
        });

        $updatedSale = $creditSale->fresh();

        return back()->with([
            'success' => 'Pembayaran hutang berhasil dicatat.',
            'receipt_url' => route('tenant.credit-payments.receipt', $payment),
            'credit_payment_amount' => (int) $payment->amount,
            'credit_payment_remaining' => max(
                (int) $updatedSale->total_amount - (int) $updatedSale->paid_amount,
                0,
            ),
        ]);
    }

    public function paymentReceipt(Request $request, CreditPayment $creditPayment): Response
    {
        abort_unless($creditPayment->tenant_id === $request->user()->tenant_id, 403);

        $creditPayment->load([
            'user:id,name',
            'creditSale.customer:id,name',
            'creditSale.transaction:id,invoice_number',
        ]);
        $tenant = $request->user()->tenant;

        return Inertia::render('Tenant/Receipts/Show', [
            'bridge_receipt_url' => URL::temporarySignedRoute(
                'bridge.credit-payments.show',
                now()->addMinutes(30),
                $creditPayment,
            ),
            'back_url' => route('tenant.credit-sales.show', $creditPayment->credit_sale_id),
            'store' => [
                'name' => $tenant->name,
                'phone' => $tenant->phone,
                'address' => $tenant->address,
                'logo_url' => $tenant->logo_url ?: asset('logo.png'),
                'receipt_size' => $tenant->receipt_size ?? '58mm',
                'receipt_footer' => $tenant->receipt_footer,
            ],
            'sale' => $this->paymentReceiptPayload($creditPayment),
        ]);
    }

    /** @return array<string, mixed> */
    private function paymentReceiptPayload(CreditPayment $payment): array
    {
        $sale = $payment->creditSale;
        $paidThroughThisPayment = (int) $sale->payments()
            ->where('id', '<=', $payment->id)
            ->sum('amount');
        $remainingAfter = max($sale->total_amount - $paidThroughThisPayment, 0);

        return [
            'receipt_type' => 'credit_payment',
            'invoice_number' => $sale->transaction->invoice_number,
            'payment_number' => 'PAY-'.str_pad((string) $payment->id, 6, '0', STR_PAD_LEFT),
            'sold_at' => $payment->created_at?->format('Y-m-d H:i'),
            'cashier' => $payment->user?->name,
            'customer' => $sale->customer?->name,
            'note' => $payment->note,
            'total_credit' => (float) $sale->total_amount,
            'remaining_before' => (float) ($remainingAfter + $payment->amount),
            'payment_amount' => (float) $payment->amount,
            'remaining_after' => (float) $remainingAfter,
            'is_paid' => $remainingAfter <= 0,
        ];
    }
}
