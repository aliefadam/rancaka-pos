<?php

namespace App\Services;

use App\Models\BillingInvoice;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\TenantBranchRelationship;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ConsolidatedBillingService
{
    public function createInvoice(Tenant $tenant, CarbonInterface $periodStart, CarbonInterface $periodEnd, ?CarbonInterface $dueAt = null): BillingInvoice
    {
        $subscription = $tenant->subscription()->firstOrFail();

        return DB::transaction(function () use ($tenant, $subscription, $periodStart, $periodEnd, $dueAt) {
            $existing = BillingInvoice::query()
                ->where('subscription_id', $subscription->id)
                ->where('period_start', $periodStart)
                ->first();
            if ($existing) {
                return $existing->load('items.branchTenant');
            }

            $invoice = BillingInvoice::create([
                'tenant_id' => $tenant->id,
                'subscription_id' => $subscription->id,
                'number' => 'INV-'.now()->format('YmdHis').'-'.$tenant->id.'-'.Str::upper(Str::random(5)),
                'status' => 'open',
                'amount' => 0,
                'due_at' => $dueAt ?? $periodStart,
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
            ]);

            $invoice->items()->create([
                'type' => 'central_plan',
                'description' => $subscription->plan_name,
                'quantity' => 1,
                'unit_amount' => $subscription->price,
                'total_amount' => $subscription->price,
            ]);

            if (config('billing.branch_network_enabled') && $tenant->isCentral()) {
                TenantBranchRelationship::query()
                    ->where('parent_tenant_id', $tenant->id)
                    ->whereIn('status', ['approved_pending_billing', 'active', 'exit_requested', 'detached_pending'])
                    ->whereNotNull('billing_effective_at')
                    ->where('billing_effective_at', '<=', $periodStart)
                    ->where(fn ($query) => $query->whereNull('detach_effective_at')->orWhere('detach_effective_at', '>', $periodStart))
                    ->with('branchTenant:id,name')
                    ->orderBy('branch_tenant_id')
                    ->get()
                    ->each(function (TenantBranchRelationship $relationship) use ($invoice) {
                        $price = (int) config('billing.branch_monthly_price');
                        $invoice->items()->create([
                            'type' => 'branch_addon',
                            'branch_tenant_id' => $relationship->branch_tenant_id,
                            'description' => 'Cabang — '.$relationship->branchTenant->name,
                            'quantity' => 1,
                            'unit_amount' => $price,
                            'total_amount' => $price,
                        ]);
                    });
            }

            $invoice->update(['amount' => (int) $invoice->items()->sum('total_amount')]);

            return $invoice->load('items.branchTenant');
        });
    }

    public function ensureItems(BillingInvoice $invoice): BillingInvoice
    {
        if ($invoice->items()->exists()) {
            return $invoice->load('items.branchTenant');
        }

        $invoice->items()->create([
            'type' => 'central_plan',
            'description' => $invoice->subscription?->plan_name ?? config('billing.plan_name'),
            'quantity' => 1,
            'unit_amount' => $invoice->amount,
            'total_amount' => $invoice->amount,
        ]);

        return $invoice->load('items.branchTenant');
    }

    public function createNextInvoice(Subscription $subscription, CarbonInterface $start, CarbonInterface $end): BillingInvoice
    {
        return $this->createInvoice($subscription->tenant, $start, $end, $start);
    }
}
