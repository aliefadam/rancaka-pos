<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\TransactionStatus;
use Database\Factories\TransactionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id', 'shift_id', 'user_id', 'invoice_number', 'status', 'payment_method',
    'subtotal', 'discount_type', 'discount_value', 'discount_amount', 'tax_amount',
    'service_charge_amount', 'additional_fee', 'total',
    'amount_received', 'change_amount',
])]
class Transaction extends Model
{
    /** @use HasFactory<TransactionFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'status' => TransactionStatus::class,
            'payment_method' => PaymentMethod::class,
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(TransactionItem::class);
    }

    public function creditSale(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(CreditSale::class);
    }
}
