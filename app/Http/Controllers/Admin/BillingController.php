<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BillingInvoice;
use App\Models\BillingSetting;
use App\Models\SubscriptionPayment;
use App\Services\SalesCommissionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\File;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Billing/Index', [
            'payments' => SubscriptionPayment::with(['tenant:id,name,email', 'invoice'])->latest()->paginate(15),
            'settings' => BillingSetting::query()->first(),
        ]);
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        $settings = BillingSetting::query()->firstOrFail();
        $data = $request->validate([
            'qris_enabled' => ['required', 'boolean'],
            'qris_merchant_name' => ['nullable', 'string', 'max:255'],
            'qris_image' => ['nullable', File::image()->max(2048)],
            'remove_qris' => ['nullable', 'boolean'],
        ]);

        if ($request->boolean('remove_qris') || $request->hasFile('qris_image')) {
            if ($settings->qris_image_path) {
                Storage::disk('public')->delete($settings->qris_image_path);
            }

            $data['qris_image_path'] = $request->hasFile('qris_image')
                ? $request->file('qris_image')->store('billing/qris', 'public')
                : null;
        }

        unset($data['qris_image'], $data['remove_qris']);

        $resultingImagePath = array_key_exists('qris_image_path', $data)
            ? $data['qris_image_path']
            : $settings->qris_image_path;

        if ($data['qris_enabled'] && ! $resultingImagePath) {
            return back()->withErrors(['qris_image' => 'Unggah gambar QRIS sebelum mengaktifkannya.']);
        }

        $settings->update($data);

        return back()->with('success', 'Pengaturan QRIS diperbarui.');
    }

    public function approve(Request $request, SubscriptionPayment $payment, SalesCommissionService $commissionService): RedirectResponse
    {
        DB::transaction(function () use ($request, $payment, $commissionService) {
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
            $commissionService->recordForFirstApprovedPayment($payment->fresh());
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
