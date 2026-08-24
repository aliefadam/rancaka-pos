<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\BillingInvoice;
use App\Models\BillingSetting;
use App\Services\BranchNetworkService;
use App\Services\OptimizedUploadService;
use App\Support\UploadRules;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function index(Request $request, BranchNetworkService $network): Response
    {
        abort_unless($request->user()->tenant?->status === 'active', 403, 'Tenant tidak aktif.');
        $tenant = $request->user()->tenant;
        $network->syncDueTransitions($tenant);
        $tenant->subscription()->firstOrCreate([], [
            'plan_code' => 'monthly',
            'plan_name' => config('billing.plan_name'),
            'price' => config('billing.monthly_price'),
            'status' => 'active',
            'is_grandfathered' => true,
        ]);

        $subscription = $tenant->subscription()
            ->with(['invoices' => fn ($q) => $q->with(['payments', 'items.branchTenant'])->latest()])
            ->first();

        $relationship = $tenant->currentBranchRelationship()
            ->with(['parentTenant:id,name,email', 'parentTenant.subscription:id,tenant_id,status,trial_ends_at,current_period_end'])
            ->first();

        $paymentSettings = BillingSetting::query()->first();

        return Inertia::render('Tenant/Billing/Index', [
            'subscription' => $subscription,
            'billing' => [
                ...config('billing'),
                'bank_name' => $paymentSettings?->bank_name ?: config('billing.bank_name'),
                'bank_account' => $paymentSettings?->bank_account ?: config('billing.bank_account'),
                'bank_holder' => $paymentSettings?->bank_holder ?: config('billing.bank_holder'),
            ],
            'paymentSettings' => $paymentSettings,
            'networkRelationship' => $relationship,
            'paymentCentralized' => $network->paymentIsCentralized($tenant),
        ]);
    }

    public function submit(Request $request, BillingInvoice $invoice, OptimizedUploadService $uploads, BranchNetworkService $network): RedirectResponse
    {
        if ($network->paymentIsCentralized($request->user()->tenant)) {
            abort(403, 'Pembayaran subscription cabang ditangani tenant pusat.');
        }
        abort_unless($invoice->tenant_id === $request->user()->tenant_id && in_array($invoice->status, ['open', 'rejected']), 403);
        $data = $request->validate([
            'payment_method' => ['required', 'in:bank_transfer,qris'],
            'proof' => UploadRules::proof(),
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        if ($data['payment_method'] === 'qris') {
            $settings = BillingSetting::query()->first();
            abort_unless($settings?->qris_enabled && $settings->qris_image_path, 422, 'QRIS tidak tersedia.');
        }
        $path = $uploads->store($request->file('proof'), "billing/{$invoice->tenant_id}");
        $invoice->payments()->create(['tenant_id' => $invoice->tenant_id, 'amount' => $invoice->amount, 'payment_method' => $data['payment_method'], 'proof_path' => $path, 'note' => $data['note'] ?? null, 'status' => 'pending', 'submitted_at' => now()]);
        $invoice->update(['status' => 'pending']);

        return back()->with('success', 'Bukti pembayaran dikirim dan menunggu verifikasi.');
    }
}
