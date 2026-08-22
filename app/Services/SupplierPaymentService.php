<?php

namespace App\Services;

use App\Models\Purchase;
use App\Models\SupplierPayment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SupplierPaymentService
{
    public function record(User $actor, Purchase $purchase, array $data, ?string $proofPath = null): SupplierPayment
    {
        return DB::transaction(function () use ($actor, $purchase, $data, $proofPath) {
            $purchase = Purchase::query()->with('installments')->lockForUpdate()->findOrFail($purchase->id);
            abort_unless($purchase->tenant_id === $actor->tenant_id, 403);

            $amount = (int) $data['amount'];
            if ($purchase->document_status !== 'posted' || $amount < 1 || $amount > $purchase->balance_amount) {
                throw ValidationException::withMessages(['amount' => 'Nominal pembayaran tidak valid atau melebihi sisa hutang.']);
            }

            $payment = SupplierPayment::create([
                'tenant_id' => $purchase->tenant_id,
                'supplier_id' => $purchase->supplier_id,
                'purchase_id' => $purchase->id,
                'number' => 'PAY-'.now()->format('Ymd').'-'.Str::upper(Str::random(6)),
                'payment_date' => $data['payment_date'],
                'amount' => $amount,
                'payment_method' => $data['payment_method'],
                'reference_number' => $data['reference_number'] ?? null,
                'proof_path' => $proofPath,
                'note' => $data['note'] ?? null,
                'created_by' => $actor->id,
            ]);

            $remaining = $amount;
            $installments = $purchase->installments->sortBy('sequence');
            if (! empty($data['installment_id'])) {
                $preferred = $installments->firstWhere('id', (int) $data['installment_id']);
                abort_unless($preferred, 422, 'Termin tidak ditemukan.');
                $installments = collect([$preferred])->merge($installments->where('id', '!=', $preferred->id));
            }

            if (! ($data['skip_installment_allocation'] ?? false)) {
                foreach ($installments as $installment) {
                    $allocatable = min($remaining, max(0, $installment->planned_amount - $installment->paid_amount));
                    if ($allocatable > 0) {
                        $payment->allocations()->create(['purchase_installment_id' => $installment->id, 'amount' => $allocatable]);
                        $remaining -= $allocatable;
                    }
                    if ($remaining === 0) {
                        break;
                    }
                }
            }

            $this->recalculate($purchase);

            return $payment->fresh(['allocations']);
        });
    }

    public function void(User $actor, SupplierPayment $payment, string $reason): void
    {
        DB::transaction(function () use ($actor, $payment, $reason) {
            abort_unless($actor->isOwner() && $payment->tenant_id === $actor->tenant_id, 403);
            $payment = SupplierPayment::query()->lockForUpdate()->findOrFail($payment->id);
            if ($payment->status !== 'valid') {
                throw ValidationException::withMessages(['payment' => 'Pembayaran ini sudah dibatalkan.']);
            }
            $payment->update(['status' => 'void', 'voided_by' => $actor->id, 'voided_at' => now(), 'void_reason' => $reason]);
            $this->recalculate($payment->purchase()->firstOrFail());
        });
    }

    public function recalculate(Purchase $purchase): void
    {
        foreach ($purchase->installments()->get() as $installment) {
            $paid = $installment->allocations()->whereHas('payment', fn ($query) => $query->where('status', 'valid'))->sum('amount');
            $status = $paid >= $installment->planned_amount ? 'paid' : ($paid > 0 ? 'partial' : ($installment->due_date->isBefore(today()) ? 'overdue' : 'scheduled'));
            $installment->update(['paid_amount' => $paid, 'status' => $status]);
        }
        $paid = $purchase->payments()->where('status', 'valid')->sum('amount');
        $balance = max(0, $purchase->total_amount - $paid);
        $purchase->update([
            'paid_amount' => $paid,
            'balance_amount' => $balance,
            'payment_status' => $balance === 0 ? 'paid' : ($paid > 0 ? 'partial' : ($purchase->due_date?->isBefore(today()) ? 'overdue' : 'unpaid')),
        ]);
    }
}
