<?php

namespace App\Http\Controllers;

use App\Enums\TransactionStatus;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;

class BridgeReceiptController extends Controller
{
    public function show(Transaction $transaction): JsonResponse
    {
        $transaction->load(['items', 'user:id,name', 'tenant']);
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

    /** @return array<string, mixed> */
    private function transactionPayload(Transaction $transaction): array
    {
        return [
            'id' => $transaction->id,
            'invoice_number' => $transaction->invoice_number,
            'status' => $transaction->status->value,
            'is_void' => $transaction->status === TransactionStatus::Voided,
            'subtotal' => (float) $transaction->subtotal,
            'discount_total' => 0,
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
                'paid_amount' => (float) ($transaction->amount_received ?? $transaction->total),
                'change_amount' => (float) ($transaction->change_amount ?? 0),
                'reference_number' => null,
            ],
        ];
    }
}
