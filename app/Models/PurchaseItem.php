<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable([
    'purchase_id', 'tenant_id', 'purchasable_type', 'purchasable_id', 'item_name', 'unit_name', 'quantity',
    'unit_cost', 'subtotal', 'allocated_discount', 'allocated_additional_cost', 'inventory_cost_total', 'inventory_unit_cost',
])]
class PurchaseItem extends Model
{
    protected function casts(): array
    {
        return ['quantity' => 'decimal:2', 'unit_cost' => 'decimal:4', 'inventory_unit_cost' => 'decimal:4'];
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function purchasable(): MorphTo
    {
        return $this->morphTo();
    }

    public function stockMovements(): MorphMany
    {
        return $this->morphMany(StockMovement::class, 'reference');
    }
}
