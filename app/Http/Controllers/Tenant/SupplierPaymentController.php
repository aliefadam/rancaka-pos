<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\SupplierPayment;
use App\Services\OptimizedUploadService;
use App\Services\SupplierPaymentService;
use App\Support\UploadRules;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SupplierPaymentController extends Controller
{
    public function store(Request $request, Purchase $purchase, SupplierPaymentService $service, OptimizedUploadService $uploads): RedirectResponse
    {
        abort_unless($purchase->tenant_id === $request->user()->tenant_id, 403);
        $data = $request->validate([
            'amount' => ['required', 'integer', 'min:1'], 'payment_date' => ['required', 'date', 'before_or_equal:today'],
            'payment_method' => ['required', Rule::in(['cash', 'transfer', 'qris', 'other'])],
            'reference_number' => ['nullable', 'string', 'max:255'], 'installment_id' => ['nullable', 'integer'],
            'note' => ['nullable', 'string', 'max:1000'], 'proof' => UploadRules::proof(false),
        ]);
        if ($data['payment_method'] !== 'cash' && ! $request->hasFile('proof')) {
            return back()->withErrors(['proof' => 'Bukti wajib untuk pembayaran non-tunai.']);
        }
        $proof = $request->hasFile('proof') ? $uploads->store($request->file('proof'), "purchases/{$request->user()->tenant_id}/payments", 'local') : null;
        try {
            $payment = $service->record($request->user(), $purchase, $data, $proof);
        } catch (\Throwable $exception) {
            if ($proof) {
                Storage::disk('local')->delete($proof);
            } throw $exception;
        }

        return back()
            ->with('success', 'Pembayaran supplier berhasil dicatat.')
            ->with('supplier_payment_receipt_url', route('tenant.supplier-payments.receipt', $payment));
    }

    public function void(Request $request, SupplierPayment $payment, SupplierPaymentService $service): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:1000'], 'password' => ['required', 'current_password']]);
        $service->void($request->user(), $payment, $data['reason']);

        return back()->with('success', 'Pembayaran berhasil dibatalkan.');
    }

    public function proof(Request $request, SupplierPayment $payment)
    {
        abort_unless($payment->tenant_id === $request->user()->tenant_id && $payment->proof_path, 404);

        return Storage::disk('local')->response($payment->proof_path);
    }

    public function receipt(Request $request, SupplierPayment $payment): Response
    {
        abort_unless($payment->tenant_id === $request->user()->tenant_id, 403);

        $payment->load([
            'supplier:id,name,address,phone,email',
            'purchase:id,number,supplier_invoice_number,total_amount',
            'creator:id,name',
            'voider:id,name',
            'allocations.installment:id,purchase_id,sequence,due_date,planned_amount',
        ]);
        $priorPaid = SupplierPayment::query()
            ->where('purchase_id', $payment->purchase_id)
            ->where('status', 'valid')
            ->where(fn ($query) => $query
                ->whereDate('payment_date', '<', $payment->payment_date)
                ->orWhere(fn ($query) => $query
                    ->whereDate('payment_date', $payment->payment_date)
                    ->where('id', '<', $payment->id)))
            ->sum('amount');
        $remainingBefore = max(0, (int) $payment->purchase->total_amount - (int) $priorPaid);
        $tenant = $request->user()->tenant;

        return Inertia::render('Tenant/SupplierPayments/Receipt', [
            'store' => [
                'name' => $tenant->name,
                'phone' => $tenant->phone,
                'address' => $tenant->address,
                'logo_url' => $tenant->logo_url ?: asset('logo.png'),
            ],
            'payment' => [
                'id' => $payment->id,
                'number' => $payment->number,
                'payment_date' => $payment->payment_date->toDateString(),
                'amount' => (int) $payment->amount,
                'payment_method' => $payment->payment_method,
                'reference_number' => $payment->reference_number,
                'note' => $payment->note,
                'status' => $payment->status,
                'created_by' => $payment->creator?->name,
                'voided_by' => $payment->voider?->name,
                'voided_at' => $payment->voided_at?->format('Y-m-d H:i'),
                'void_reason' => $payment->void_reason,
                'proof_url' => $payment->proof_path ? route('tenant.supplier-payments.proof', $payment) : null,
                'remaining_before' => $remainingBefore,
                'remaining_after' => $payment->status === 'valid' ? max(0, $remainingBefore - (int) $payment->amount) : $remainingBefore,
                'allocations' => $payment->allocations->map(fn ($allocation) => [
                    'sequence' => $allocation->installment?->sequence,
                    'due_date' => $allocation->installment?->due_date?->toDateString(),
                    'amount' => (int) $allocation->amount,
                ])->values(),
            ],
            'purchase' => [
                'id' => $payment->purchase->id,
                'number' => $payment->purchase->number,
                'supplier_invoice_number' => $payment->purchase->supplier_invoice_number,
                'total_amount' => (int) $payment->purchase->total_amount,
            ],
            'supplier' => $payment->supplier,
            'back_url' => route('tenant.purchases.show', $payment->purchase),
        ]);
    }
}
