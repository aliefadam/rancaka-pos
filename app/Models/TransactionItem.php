<?php

namespace App\Models;

use Database\Factories\TransactionItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['transaction_id', 'product_id', 'product_price_option_id', 'product_name', 'price_option_name', 'unit_price', 'cost_snapshot', 'total_cost_snapshot', 'quantity', 'note', 'discount_type', 'discount_value', 'discount_amount', 'subtotal'])]
class TransactionItem extends Model
{
    /** @use HasFactory<TransactionItemFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return ['cost_snapshot' => 'decimal:4', 'total_cost_snapshot' => 'decimal:4'];
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function priceOption(): BelongsTo
    {
        return $this->belongsTo(ProductPriceOption::class, 'product_price_option_id');
    }
}
