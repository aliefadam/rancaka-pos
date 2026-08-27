<?php

namespace App\Services;

use App\Models\Purchase;
use App\Models\PurchaseInstallment;
use App\Models\PurchaseInstallmentScheduleHistory;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchaseInstallmentService
{
    public function __construct(private readonly SupplierPaymentService $payments) {}

    /** @param array<int, array{id?: int|null, due_date: string, planned_amount: int}> $schedule */
    public function revise(User $actor, Purchase $purchase, array $schedule, string $reason): Purchase
    {
        return DB::transaction(function () use ($actor, $purchase, $schedule, $reason) {
            $purchase = Purchase::query()->lockForUpdate()->findOrFail($purchase->id);
            abort_unless($purchase->tenant_id === $actor->tenant_id, 403);

            if ($purchase->document_status !== 'posted' || $purchase->payment_term !== 'installment') {
                throw ValidationException::withMessages([
                    'installments' => 'Jadwal hanya dapat direvisi untuk pembelian cicilan yang masih aktif.',
                ]);
            }

            $this->payments->recalculate($purchase);
            $installments = $purchase->installments()->lockForUpdate()->get();

            $existingById = $installments->keyBy('id');
            $submittedIds = collect($schedule)->pluck('id')->filter()->map(fn ($id) => (int) $id);
            if ($submittedIds->duplicates()->isNotEmpty()) {
                throw ValidationException::withMessages(['installments' => 'Termin yang sama tidak boleh dikirim lebih dari sekali.']);
            }
            if ($submittedIds->contains(fn ($id) => ! $existingById->has($id))) {
                throw ValidationException::withMessages(['installments' => 'Terdapat termin yang bukan milik pembelian ini.']);
            }

            $omittedPaid = $installments->first(fn (PurchaseInstallment $item) => $item->paid_amount > 0 && ! $submittedIds->contains($item->id));
            if ($omittedPaid) {
                throw ValidationException::withMessages([
                    'installments' => "Termin {$omittedPaid->sequence} sudah memiliki pembayaran dan tidak boleh dihapus.",
                ]);
            }

            foreach ($schedule as $index => $row) {
                if (empty($row['id'])) {
                    continue;
                }
                $existing = $existingById->get((int) $row['id']);
                if ((int) $row['planned_amount'] < (int) $existing->paid_amount) {
                    throw ValidationException::withMessages([
                        "installments.{$index}.planned_amount" => 'Nominal termin tidak boleh lebih kecil dari jumlah yang sudah dibayar.',
                    ]);
                }
            }

            $requiredTotal = (int) $installments->sum('planned_amount');
            $submittedTotal = collect($schedule)->sum(fn ($row) => (int) $row['planned_amount']);
            if ($submittedTotal !== $requiredTotal) {
                throw ValidationException::withMessages([
                    'installments' => 'Total jadwal harus tetap '.number_format($requiredTotal, 0, ',', '.').' agar nilai hutang tidak berubah.',
                ]);
            }

            $before = $this->snapshot($installments);
            $purchase->installments()->whereNotIn('id', $submittedIds->all())->delete();
            $purchase->installments()->update(['sequence' => DB::raw('sequence + 1000')]);

            foreach ($schedule as $index => $row) {
                $attributes = [
                    'tenant_id' => $purchase->tenant_id,
                    'sequence' => $index + 1,
                    'due_date' => $row['due_date'],
                    'planned_amount' => (int) $row['planned_amount'],
                ];

                if (! empty($row['id'])) {
                    $purchase->installments()->whereKey((int) $row['id'])->update($attributes);
                } else {
                    $purchase->installments()->create($attributes);
                }
            }

            $this->payments->recalculate($purchase);
            $updated = $purchase->installments()->get();
            $purchase->update(['due_date' => $updated->max('due_date')]);

            PurchaseInstallmentScheduleHistory::create([
                'tenant_id' => $purchase->tenant_id,
                'purchase_id' => $purchase->id,
                'changed_by' => $actor->id,
                'before_schedule' => $before,
                'after_schedule' => $this->snapshot($updated),
                'reason' => $reason,
            ]);

            return $purchase->fresh(['installments', 'installmentScheduleHistories.actor']);
        });
    }

    /** @return array<int, array<string, mixed>> */
    private function snapshot(Collection $installments): array
    {
        return $installments->sortBy('sequence')->values()->map(fn (PurchaseInstallment $item) => [
            'id' => $item->id,
            'sequence' => $item->sequence,
            'due_date' => $item->due_date->toDateString(),
            'planned_amount' => (int) $item->planned_amount,
            'paid_amount' => (int) $item->paid_amount,
            'status' => $item->status,
        ])->all();
    }
}
