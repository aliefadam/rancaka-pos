<?php

namespace App\Models;

use App\Models\Concerns\HasStockMovements;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['name', 'category_id', 'price', 'track_stock', 'stock', 'is_active', 'tenant_id'])]
class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory, HasStockMovements;

    protected function casts(): array
    {
        return [
            'price' => 'integer',
            'track_stock' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function rawMaterials(): BelongsToMany
    {
        return $this->belongsToMany(RawMaterial::class, 'product_ingredients')
            ->withPivot('quantity')
            ->withTimestamps();
    }
}
