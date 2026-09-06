<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Models\CommissionPayout;
use App\Models\SalesCommission;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $sales = $request->user()->salesProfile()->firstOrFail();
        $downlines = Tenant::query()
            ->where('referred_by_sales_id', $sales->id)
            ->with([
                'subscription:id,tenant_id,status,trial_ends_at,current_period_end',
                'salesCommission:id,tenant_id,base_amount,commission_type_snapshot,commission_rate_snapshot,commission_value_snapshot,commission_amount,status,approved_at,paid_at',
                'billingInvoices' => fn ($query) => $query->oldest()->limit(1)->select('id', 'tenant_id', 'number', 'amount', 'status', 'due_at'),
            ])
            ->oldest('referred_at')
            ->get(['id', 'name', 'referred_at', 'created_at']);

        $projected = 0;
        $rows = $downlines->map(function (Tenant $tenant) use ($sales, &$projected) {
            $commission = $tenant->salesCommission;
            $invoice = $tenant->billingInvoices->first();
            $commissionType = $commission?->commission_type_snapshot ?? $sales->commission_type ?? 'percentage';
            $commissionValue = $commission
                ? ($commissionType === 'fixed' ? (int) $commission->commission_value_snapshot : $commission->commission_rate_snapshot)
                : ($commissionType === 'fixed' ? (int) $sales->commission_value : $sales->commission_rate);
            $estimate = $commission
                ? (int) $commission->commission_amount
                : ($commissionType === 'fixed'
                    ? (int) $sales->commission_value
                    : (int) round(((int) ($invoice?->amount ?? 0)) * ((float) $sales->commission_rate) / 100));

            if (! $commission) {
                $projected += $estimate;
            }

            return [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'referred_at' => $tenant->referred_at ?? $tenant->created_at,
                'subscription_status' => $tenant->subscription?->status ?? 'inactive',
                'subscription_ends_at' => $tenant->subscription?->current_period_end ?? $tenant->subscription?->trial_ends_at,
                'invoice_number' => $invoice?->number,
                'invoice_amount' => (int) ($invoice?->amount ?? 0),
                'commission_amount' => $estimate,
                'commission_status' => $commission?->status ?? 'projected',
                'commission_type' => $commissionType,
                'commission_value' => $commissionValue,
            ];
        })->values();

        $earned = (int) SalesCommission::query()->where('sales_profile_id', $sales->id)->sum('commission_amount');

        return Inertia::render('Sales/Dashboard', [
            'sales' => $sales->only(['name', 'referral_code', 'commission_type', 'commission_rate', 'commission_value']),
            'downlines' => $rows,
            'metrics' => [
                'referrals' => $rows->count(),
                'active' => $rows->where('subscription_status', 'active')->count(),
                'trialing' => $rows->where('subscription_status', 'trialing')->count(),
                'estimated_total' => $earned + $projected,
                'projected' => $projected,
                'earned' => $earned,
                'accrued' => (int) SalesCommission::query()->where('sales_profile_id', $sales->id)->where('status', 'accrued')->sum('commission_amount'),
                'paid' => (int) SalesCommission::query()->where('sales_profile_id', $sales->id)->where('status', 'paid')->sum('commission_amount'),
            ],
            'payouts' => CommissionPayout::query()->where('sales_profile_id', $sales->id)->latest('paid_at')->get()->map(fn ($payout) => [
                'id' => $payout->id,
                'number' => $payout->number,
                'amount' => (int) $payout->amount,
                'paid_at' => $payout->paid_at,
                'note' => $payout->note,
                'proof_url' => $payout->proof_path ? route('sales.payouts.proof', $payout) : null,
            ]),
        ]);
    }

    public function proof(Request $request, CommissionPayout $payout): StreamedResponse
    {
        abort_unless($payout->sales_profile_id === $request->user()->salesProfile?->id, 403);
        abort_unless($payout->proof_path && Storage::disk('local')->exists($payout->proof_path), 404);

        return Storage::disk('local')->download($payout->proof_path);
    }
}
