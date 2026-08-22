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
            $service->record($request->user(), $purchase, $data, $proof);
        } catch (\Throwable $exception) {
            if ($proof) {
                Storage::disk('local')->delete($proof);
            } throw $exception;
        }

        return back()->with('success', 'Pembayaran supplier berhasil dicatat.');
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
}
