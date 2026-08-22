<?php

namespace App\Models;

use App\Models\Concerns\HasStockMovements;
use Database\Factories\RawMaterialFactory;
use Illuminate\Database\Eloquent\Attributes\Appends;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['name', 'unit', 'stock', 'average_cost', 'opening_cost_confirmed_at', 'opening_cost_confirmed_by', 'is_active', 'tenant_id'])]
#[Appends(['is_low_stock'])]
class RawMaterial extends Model
{
    /** @use HasFactory<RawMaterialFactory> */
    use HasFactory, HasStockMovements;

    public const LOW_STOCK_THRESHOLD = 5;

    protected function casts(): array
    {
        return [
            'stock' => 'decimal:2',
            'average_cost' => 'decimal:4',
            'opening_cost_confirmed_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    protected function isLowStock(): Attribute
    {
        return Attribute::get(fn () => $this->stock <= self::LOW_STOCK_THRESHOLD);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_ingredients')
            ->withPivot('quantity')
            ->withTimestamps();
    }
}
