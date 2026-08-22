<?php

namespace App\Services;

use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\RawMaterial;
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
    public static function record(Model $stockable, StockMovementType $type, float $quantity, ?string $note, int $userId, array $context = []): StockMovement
    {
        return DB::transaction(function () use ($stockable, $type, $quantity, $note, $userId, $context) {
            $stockable = $stockable->newQuery()->lockForUpdate()->findOrFail($stockable->getKey());
            $stockBefore = (float) $stockable->stock;
            $averageBefore = self::averageCost($stockable);
            $stockAfter = $stockBefore + $quantity;

            if ($stockAfter < -0.000001) {
                $name = $stockable->getAttribute('name') ?? 'item';
                throw ValidationException::withMessages(['stock' => "Stok {$name} tidak cukup (tersisa {$stockable->stock})."]);
            }

            $unitCost = array_key_exists('unit_cost', $context) ? (float) $context['unit_cost'] : $averageBefore;
            $averageAfter = $averageBefore;
            if ($quantity > 0 && array_key_exists('unit_cost', $context)) {
                $averageAfter = $stockAfter > 0
                    ? round((($stockBefore * $averageBefore) + ($quantity * $unitCost)) / $stockAfter, 4)
                    : $unitCost;
            }
            if (array_key_exists('force_average_cost_after', $context)) {
                $averageAfter = (float) $context['force_average_cost_after'];
            }

            $stockable->stock = max(0, $stockAfter);
            self::setAverageCost($stockable, $averageAfter);
            if ($stockable instanceof RawMaterial && $stockBefore <= 0 && $quantity > 0 && array_key_exists('unit_cost', $context) && ! $stockable->opening_cost_confirmed_at) {
                $stockable->opening_cost_confirmed_at = now();
                $stockable->opening_cost_confirmed_by = $userId;
            }
            $stockable->save();

            $reference = $context['reference'] ?? null;

            return StockMovement::create([
                'tenant_id' => $stockable->tenant_id,
                'stockable_type' => $stockable->getMorphClass(),
                'stockable_id' => $stockable->id,
                'type' => $type,
                'quantity' => $quantity,
                'note' => $note,
                'user_id' => $userId,
                'reference_type' => $reference instanceof Model ? $reference->getMorphClass() : null,
                'reference_id' => $reference instanceof Model ? $reference->getKey() : null,
                'stock_before' => $stockBefore,
                'stock_after' => max(0, $stockAfter),
                'average_cost_before' => $averageBefore,
                'average_cost_after' => $averageAfter,
                'unit_cost_snapshot' => $unitCost,
                'total_cost_snapshot' => round(abs($quantity) * $unitCost, 4),
            ]);
        });
    }

    private static function averageCost(Model $stockable): float
    {
        return (float) ($stockable instanceof RawMaterial ? $stockable->average_cost : $stockable->cost);
    }

    private static function setAverageCost(Model $stockable, float $cost): void
    {
        if ($stockable instanceof RawMaterial) {
            $stockable->average_cost = $cost;

            return;
        }

        if ($stockable instanceof Product) {
            $stockable->cost = $cost;
            $stockable->margin_percentage = $cost > 0 ? round((($stockable->price - $cost) / $cost) * 100, 2) : 0;
        }
    }
}
