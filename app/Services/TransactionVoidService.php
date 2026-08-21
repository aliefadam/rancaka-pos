<?php

namespace App\Services;

use App\Enums\StockMovementType;
use App\Enums\TransactionStatus;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransactionVoidService
{
    /**
     * @param  array<int, int>  $transactionIds
     */
    public function voidMany(User $actor, array $transactionIds, string $reason): int
    {
        return DB::transaction(function () use ($actor, $transactionIds, $reason) {
            $ids = collect($transactionIds)->map(fn ($id) => (int) $id)->unique()->values();
            $transactions = Transaction::query()
                ->where('tenant_id', $actor->tenant_id)
                ->whereIn('id', $ids)
                ->lockForUpdate()
                ->with(['user:id,name', 'shift.user:id,name', 'items.product.rawMaterials'])
                ->get();

            if ($transactions->count() !== $ids->count()) {
                throw ValidationException::withMessages([
                    'transactions' => 'Sebagian transaksi tidak ditemukan atau bukan milik toko ini.',
                ]);
            }

            if ($transactions->contains(fn (Transaction $transaction) => $transaction->status !== TransactionStatus::Completed)) {
                throw ValidationException::withMessages([
                    'transactions' => 'Hanya transaksi berstatus selesai yang dapat dibatalkan.',
                ]);
            }

            if (! $actor->isOwner() && $transactions->contains(fn (Transaction $transaction) => $transaction->created_at->lt(now()->subDay()))) {
                throw ValidationException::withMessages([
                    'transactions' => 'Transaksi hanya dapat dibatalkan maksimal 1x24 jam. Hubungi owner untuk transaksi yang lebih lama.',
                ]);
            }

            foreach ($transactions as $transaction) {
                $this->restoreStock($transaction, $actor, $reason);
                $transaction->update([
                    'status' => TransactionStatus::Voided,
                    'voided_by' => $actor->id,
                    'voided_at' => now(),
                    'void_reason' => $reason,
                ]);
            }

            return $transactions->count();
        });
    }

    private function restoreStock(Transaction $transaction, User $actor, string $reason): void
    {
        $cashierName = $transaction->user?->name ?? $transaction->shift?->user?->name ?? '-';
        $note = "Pembatalan transaksi {$transaction->invoice_number} (Kasir: {$cashierName}; Alasan: {$reason})";

        foreach ($transaction->items as $item) {
            if (! $item->product) {
                continue;
            }

            if ($item->product->track_stock) {
                StockMovementService::record(
                    $item->product,
                    StockMovementType::Adjustment,
                    $item->quantity,
                    $note,
                    $actor->id,
                );
            }

            foreach ($item->product->rawMaterials as $rawMaterial) {
                StockMovementService::record(
                    $rawMaterial,
                    StockMovementType::Adjustment,
                    $rawMaterial->pivot->quantity * $item->quantity,
                    $note,
                    $actor->id,
                );
            }
        }
    }
}
