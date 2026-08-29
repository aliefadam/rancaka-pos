<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable([
    'stock_opname_id', 'tenant_id', 'stockable_type', 'stockable_id', 'item_name', 'item_type',
    'unit_name', 'system_stock_snapshot', 'average_cost_snapshot', 'physical_stock', 'counted_by',
    'counted_at', 'expected_stock_at_count', 'average_cost_at_count', 'variance_quantity',
    'variance_value', 'posted_stock_before', 'posted_stock_after', 'stock_movement_id',
])]
class StockOpnameItem extends Model
{
    protected function casts(): array
    {
        return [
            'system_stock_snapshot' => 'decimal:4',
            'average_cost_snapshot' => 'decimal:4',
            'physical_stock' => 'decimal:4',
            'counted_at' => 'datetime',
            'expected_stock_at_count' => 'decimal:4',
            'average_cost_at_count' => 'decimal:4',
            'variance_quantity' => 'decimal:4',
            'variance_value' => 'decimal:4',
            'posted_stock_before' => 'decimal:4',
            'posted_stock_after' => 'decimal:4',
        ];
    }

    public function stockOpname(): BelongsTo
    {
        return $this->belongsTo(StockOpname::class);
    }

    public function stockable(): MorphTo
    {
        return $this->morphTo();
    }

    public function counter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'counted_by');
    }

    public function stockMovement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class);
    }
}
