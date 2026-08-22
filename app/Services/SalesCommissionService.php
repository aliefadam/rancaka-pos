<?php

namespace App\Services;

use App\Models\SalesCommission;
use App\Models\SubscriptionPayment;
use App\Models\Tenant;

class SalesCommissionService
{
    public function recordForFirstApprovedPayment(SubscriptionPayment $payment): ?SalesCommission
    {
        $tenant = Tenant::query()->with('referringSales')->lockForUpdate()->findOrFail($payment->tenant_id);

        if (! $tenant->referringSales || SalesCommission::query()->where('tenant_id', $tenant->id)->exists()) {
            return null;
        }

        $hasEarlierApprovedPayment = SubscriptionPayment::query()
            ->where('tenant_id', $tenant->id)
            ->where('status', 'approved')
            ->whereKeyNot($payment->id)
            ->exists();

        if ($hasEarlierApprovedPayment) {
            return null;
        }

        $rate = (string) $tenant->referringSales->commission_rate;
        $basisPoints = (int) round(((float) $rate) * 100);
        $baseAmount = (int) ($payment->invoice?->items()->where('type', 'central_plan')->sum('total_amount') ?: $payment->amount);
        $commissionAmount = intdiv(($baseAmount * $basisPoints) + 5000, 10000);

        return SalesCommission::create([
            'sales_profile_id' => $tenant->referringSales->id,
            'tenant_id' => $tenant->id,
            'billing_invoice_id' => $payment->billing_invoice_id,
            'subscription_payment_id' => $payment->id,
            'base_amount' => $baseAmount,
            'commission_rate_snapshot' => $rate,
            'commission_amount' => $commissionAmount,
            'status' => 'accrued',
            'approved_at' => $payment->reviewed_at ?? now(),
        ]);
    }
}
