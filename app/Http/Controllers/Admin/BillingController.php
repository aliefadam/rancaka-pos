<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BillingInvoice;
use App\Models\SubscriptionPayment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Billing/Index', ['payments' => SubscriptionPayment::with(['tenant:id,name,email', 'invoice'])->latest()->paginate(15)]);
    }

    public function approve(Request $request, SubscriptionPayment $payment): RedirectResponse
    {
        DB::transaction(function () use ($request, $payment) {
            $payment = SubscriptionPayment::lockForUpdate()->findOrFail($payment->id);
            abort_unless($payment->status === 'pending', 422);
            $invoice = $payment->invoice()->lockForUpdate()->firstOrFail();
            $subscription = $invoice->subscription()->lockForUpdate()->firstOrFail();
            $start = now();
            foreach ([$subscription->trial_ends_at, $subscription->current_period_end] as $candidate) {
                if ($candidate?->greaterThan($start)) {
                    $start = $candidate->copy();
                }
            }
            $end = $start->copy()->addMonth();
            $payment->update(['status' => 'approved', 'reviewed_at' => now(), 'reviewed_by' => $request->user()->id]);
            $invoice->update(['status' => 'paid', 'paid_at' => now(), 'period_start' => $start, 'period_end' => $end]);
            $subscription->update(['status' => 'active', 'is_grandfathered' => false, 'current_period_start' => $start, 'current_period_end' => $end]);
            BillingInvoice::create(['tenant_id' => $invoice->tenant_id, 'subscription_id' => $subscription->id, 'number' => 'INV-'.now()->format('YmdHis').'-'.$invoice->tenant_id.'-'.Str::upper(Str::random(4)), 'status' => 'open', 'amount' => $subscription->price, 'due_at' => $end, 'period_start' => $end, 'period_end' => $end->copy()->addMonth()]);
        });

        return back()->with('success', 'Pembayaran disetujui dan masa aktif diperpanjang.');
    }

    public function reject(Request $request, SubscriptionPayment $payment): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:500']]);
        abort_unless($payment->status === 'pending', 422);
        DB::transaction(function () use ($request, $payment, $data) {
            $payment->update(['status' => 'rejected', 'rejection_reason' => $data['reason'], 'reviewed_at' => now(), 'reviewed_by' => $request->user()->id]);
            $payment->invoice->update(['status' => 'rejected']);
        });

        return back()->with('success', 'Pembayaran ditolak. Tenant dapat mengirim bukti baru.');
    }
}
