<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tenant_id', 'transaction_id', 'credit_customer_id', 'total_amount', 'paid_amount', 'status'])]
class CreditSale extends Model
{
    protected function casts(): array { return ['total_amount' => 'integer', 'paid_amount' => 'integer']; }
    public function customer(): BelongsTo { return $this->belongsTo(CreditCustomer::class, 'credit_customer_id'); }
    public function transaction(): BelongsTo { return $this->belongsTo(Transaction::class); }
    public function payments(): HasMany { return $this->hasMany(CreditPayment::class); }
}
