<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\BillingInvoice;
use App\Models\BillingSetting;
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
        $subscription = $request->user()->tenant->subscription()->with(['invoices' => fn ($q) => $q->with('payments')->latest()])->firstOrFail();

        return Inertia::render('Tenant/Billing/Index', [
            'subscription' => $subscription,
            'billing' => config('billing'),
            'paymentSettings' => BillingSetting::query()->first(),
        ]);
    }

    public function submit(Request $request, BillingInvoice $invoice): RedirectResponse
    {
        abort_unless($invoice->tenant_id === $request->user()->tenant_id && in_array($invoice->status, ['open', 'rejected']), 403);
        $data = $request->validate([
            'payment_method' => ['required', 'in:bank_transfer,qris'],
            'proof' => ['required', File::types(['jpg', 'jpeg', 'png', 'webp', 'pdf'])->max(2048)],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        if ($data['payment_method'] === 'qris') {
            $settings = BillingSetting::query()->first();
            abort_unless($settings?->qris_enabled && $settings->qris_image_path, 422, 'QRIS tidak tersedia.');
        }
        $path = $request->file('proof')->store("billing/{$invoice->tenant_id}", 'public');
        $invoice->payments()->create(['tenant_id' => $invoice->tenant_id, 'amount' => $invoice->amount, 'payment_method' => $data['payment_method'], 'proof_path' => $path, 'note' => $data['note'] ?? null, 'status' => 'pending', 'submitted_at' => now()]);
        $invoice->update(['status' => 'pending']);

        return back()->with('success', 'Bukti pembayaran dikirim dan menunggu verifikasi.');
    }
}
