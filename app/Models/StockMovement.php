<?php

namespace App\Models;

use App\Enums\StockMovementType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable(['tenant_id', 'stockable_type', 'stockable_id', 'type', 'quantity', 'note', 'user_id', 'reference_type', 'reference_id', 'stock_before', 'stock_after', 'average_cost_before', 'average_cost_after', 'unit_cost_snapshot', 'total_cost_snapshot'])]
class StockMovement extends Model
{
    protected function casts(): array
    {
        return [
            'type' => StockMovementType::class,
            'quantity' => 'decimal:2',
            'stock_before' => 'decimal:2', 'stock_after' => 'decimal:2',
            'average_cost_before' => 'decimal:4', 'average_cost_after' => 'decimal:4',
            'unit_cost_snapshot' => 'decimal:4', 'total_cost_snapshot' => 'decimal:4',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function stockable(): MorphTo
    {
        return $this->morphTo();
    }

    public function reference(): MorphTo
    {
        return $this->morphTo();
    }
}
