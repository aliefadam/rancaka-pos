<?php

namespace App\Models\Concerns;

use App\Models\StockMovement;
use Illuminate\Database\Eloquent\Relations\MorphMany;

trait HasStockMovements
{
    public function stockMovements(): MorphMany
    {
        return $this->morphMany(StockMovement::class, 'stockable');
    }
}
