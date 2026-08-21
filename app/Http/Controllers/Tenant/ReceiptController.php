<?php

namespace App\Http\Controllers\Tenant;

use App\Enums\TransactionStatus;
use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;

class ReceiptController extends Controller
{
    public function show(Request $request, Transaction $transaction): Response
    {
        abort_unless($transaction->tenant_id === $request->user()->tenant_id, 403);

        if ($request->user()->isEmployee()
            && ($request->user()->hasRestrictedCashierAccess()
                || ! $request->user()->hasPermission('transactions.view'))) {
            abort_unless(
                $transaction->user_id === $request->user()->id
                    && $transaction->created_at?->isToday(),
                403,
            );
        }

        $transaction->load(['items', 'user:id,name', 'creditSale.customer:id,name']);
        $tenant = $request->user()->tenant;
        $creditSale = $transaction->creditSale;

        return Inertia::render('Tenant/Receipts/Show', [
            'bridge_receipt_url' => URL::temporarySignedRoute(
                'bridge.receipts.show',
                now()->addMinutes(30),
                $transaction,
            ),
            'store' => [
                'name' => $tenant->name,
                'phone' => $tenant->phone,
                'address' => $tenant->address,
                'logo_url' => $tenant->logo_url ?: asset('logo.png'),
                'receipt_size' => $tenant->receipt_size ?? '58mm',
                'receipt_footer' => $tenant->receipt_footer,
            ],
            'sale' => [
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
                'sold_at' => $transaction->created_at?->format('Y-m-d H:i'),
                'cashier' => $transaction->user?->name,
                'payment' => [
                    'method' => $transaction->payment_method->value,
                    'paid_amount' => (float) ($creditSale?->paid_amount ?? $transaction->amount_received ?? $transaction->total),
                    'change_amount' => (float) ($transaction->change_amount ?? 0),
                    'credit_customer' => $creditSale?->customer?->name,
                    'remaining_amount' => $creditSale
                        ? max((float) $creditSale->total_amount - (float) $creditSale->paid_amount, 0)
                        : 0,
                ],
                'items' => $transaction->items->map(fn ($item) => [
                    'product_name' => $item->product_name,
                    'quantity' => (int) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'line_total' => (float) $item->subtotal,
                    'note' => $item->note,
                ])->values(),
            ],
        ]);
    }
}
