<?php

namespace App\Http\Controllers;

use App\Enums\TransactionStatus;
use App\Models\Transaction;
use App\Models\CreditPayment;
use Illuminate\Http\JsonResponse;

class BridgeReceiptController extends Controller
{
    public function show(Transaction $transaction): JsonResponse
    {
        $transaction->load(['items', 'user:id,name', 'tenant', 'creditSale.customer:id,name']);
        $tenant = $transaction->tenant;

        return response()->json([
            'store' => [
                'name' => $tenant?->name ?? 'Rancaka',
                'phone' => $tenant?->phone,
                'address' => $tenant?->address,
                'logo_url' => $tenant?->logo_url ?: asset('logo.png'),
                'receipt_size' => $tenant?->receipt_size ?? '58mm',
                'receipt_footer' => $tenant?->receipt_footer,
            ],
            'sale' => $this->transactionPayload($transaction),
        ]);
    }

    public function creditPayment(CreditPayment $creditPayment): JsonResponse
    {
        $creditPayment->load([
            'user:id,name',
            'creditSale.customer:id,name',
            'creditSale.transaction.tenant',
        ]);
        $sale = $creditPayment->creditSale;
        $tenant = $sale->transaction->tenant;
        $paidThroughThisPayment = (int) $sale->payments()
            ->where('id', '<=', $creditPayment->id)
            ->sum('amount');
        $remainingAfter = max($sale->total_amount - $paidThroughThisPayment, 0);

        return response()->json([
            'store' => [
                'name' => $tenant?->name ?? 'Rancaka',
                'phone' => $tenant?->phone,
                'address' => $tenant?->address,
                'receipt_size' => $tenant?->receipt_size ?? '58mm',
                'receipt_footer' => $tenant?->receipt_footer,
            ],
            'sale' => [
                'receipt_type' => 'credit_payment',
                'invoice_number' => $sale->transaction->invoice_number,
                'payment_number' => 'PAY-'.str_pad((string) $creditPayment->id, 6, '0', STR_PAD_LEFT),
                'sold_at' => $creditPayment->created_at?->format('Y-m-d H:i:s'),
                'cashier' => $creditPayment->user?->name,
                'customer' => $sale->customer?->name,
                'note' => $creditPayment->note,
                'total_credit' => (float) $sale->total_amount,
                'remaining_before' => (float) ($remainingAfter + $creditPayment->amount),
                'payment_amount' => (float) $creditPayment->amount,
                'remaining_after' => (float) $remainingAfter,
                'is_paid' => $remainingAfter <= 0,
            ],
        ]);
    }

    /** @return array<string, mixed> */
    private function transactionPayload(Transaction $transaction): array
    {
        $creditSale = $transaction->creditSale;

        return [
            'id' => $transaction->id,
            'invoice_number' => $transaction->invoice_number,
            'status' => $transaction->status->value,
            'is_void' => $transaction->status === TransactionStatus::Voided,
            'subtotal' => (float) $transaction->subtotal,
            'discount_type' => $transaction->discount_type,
            'discount_value' => (float) $transaction->discount_value,
            'discount_total' => (float) $transaction->discount_amount,
            'tax_total' => (float) $transaction->tax_amount,
            'service_charge_total' => (float) $transaction->service_charge_amount,
            'additional_fee' => (float) $transaction->additional_fee,
            'grand_total' => (float) $transaction->total,
            'sold_at' => $transaction->created_at?->format('Y-m-d H:i:s'),
            'cashier' => $transaction->user?->name,
            'items' => $transaction->items->map(fn ($item) => [
                'name' => $item->product_name,
                'code' => null,
                'quantity' => (int) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'discount_amount' => 0,
                'line_total' => (float) $item->subtotal,
                'note' => $item->note,
            ])->values(),
            'payment' => [
                'method' => $transaction->payment_method->value,
                'amount' => (float) $transaction->total,
                'paid_amount' => (float) ($creditSale?->paid_amount ?? $transaction->amount_received ?? $transaction->total),
                'change_amount' => (float) ($transaction->change_amount ?? 0),
                'reference_number' => null,
                'credit_customer' => $creditSale?->customer?->name,
                'remaining_amount' => $creditSale
                    ? max((float) $creditSale->total_amount - (float) $creditSale->paid_amount, 0)
                    : 0,
            ],
        ];
    }
}
