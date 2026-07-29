<?php

namespace App\Services;

use App\Enums\StockMovementType;
use App\Models\StockMovement;
use Illuminate\Database\Eloquent\Model;

class StockMovementService
{
    /**
     * Apply a stock change to the given stockable model and log the movement.
     * $quantity may be positive (increase) or negative (decrease).
     */
    public static function record(Model $stockable, StockMovementType $type, float $quantity, ?string $note, int $userId): StockMovement
    {
        $stockable->increment('stock', $quantity);

        return StockMovement::create([
            'tenant_id' => $stockable->tenant_id,
            'stockable_type' => $stockable->getMorphClass(),
            'stockable_id' => $stockable->id,
            'type' => $type,
            'quantity' => $quantity,
            'note' => $note,
            'user_id' => $userId,
        ]);
    }
}
