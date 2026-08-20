<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\BillingInvoice;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\File;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->tenant?->status === 'active', 403, 'Tenant tidak aktif.');
        $tenant = $request->user()->tenant;
        $tenant->subscription()->firstOrCreate([], [
            'plan_code' => 'monthly',
            'plan_name' => config('billing.plan_name'),
            'price' => config('billing.monthly_price'),
            'status' => 'active',
            'is_grandfathered' => true,
        ]);

        $subscription = $tenant->subscription()
            ->with(['invoices' => fn ($q) => $q->with('payments')->latest()])
            ->first();

        return Inertia::render('Tenant/Billing/Index', ['subscription' => $subscription, 'billing' => config('billing')]);
    }

    public function submit(Request $request, BillingInvoice $invoice): RedirectResponse
    {
        abort_unless($invoice->tenant_id === $request->user()->tenant_id && in_array($invoice->status, ['open', 'rejected']), 403);
        $data = $request->validate(['proof' => ['required', File::types(['jpg', 'jpeg', 'png', 'webp', 'pdf'])->max(2048)], 'note' => ['nullable', 'string', 'max:500']]);
        $path = $request->file('proof')->store("billing/{$invoice->tenant_id}", 'public');
        $invoice->payments()->create(['tenant_id' => $invoice->tenant_id, 'amount' => $invoice->amount, 'proof_path' => $path, 'note' => $data['note'] ?? null, 'status' => 'pending', 'submitted_at' => now()]);
        $invoice->update(['status' => 'pending']);

        return back()->with('success', 'Bukti pembayaran dikirim dan menunggu verifikasi.');
    }
}
