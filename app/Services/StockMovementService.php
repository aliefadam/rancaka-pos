<?php

namespace App\Services;

use App\Enums\StockMovementType;
use App\Models\StockMovement;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockMovementService
{
    /**
     * Apply a stock change to the given stockable model and log the movement.
     * $quantity may be positive (increase) or negative (decrease).
     */
    public static function record(Model $stockable, StockMovementType $type, float $quantity, ?string $note, int $userId): StockMovement
    {
        return DB::transaction(function () use ($stockable, $type, $quantity, $note, $userId) {
            if ($quantity < 0) {
                $deduction = abs($quantity);
                $updated = $stockable->newQuery()
                    ->whereKey($stockable->getKey())
                    ->where('stock', '>=', $deduction)
                    ->decrement('stock', $deduction);

                if ($updated === 0) {
                    $stockable->refresh();
                    $name = $stockable->getAttribute('name') ?? 'item';

                    throw ValidationException::withMessages([
                        'stock' => "Stok {$name} tidak cukup (tersisa {$stockable->stock}).",
                    ]);
                }
            } else {
                $stockable->increment('stock', $quantity);
            }

            $stockable->refresh();

            return StockMovement::create([
                'tenant_id' => $stockable->tenant_id,
                'stockable_type' => $stockable->getMorphClass(),
                'stockable_id' => $stockable->id,
                'type' => $type,
                'quantity' => $quantity,
                'note' => $note,
                'user_id' => $userId,
            ]);
        });
    }
}
