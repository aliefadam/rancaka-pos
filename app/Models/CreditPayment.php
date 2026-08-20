<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'credit_sale_id', 'user_id', 'amount', 'note'])]
class CreditPayment extends Model
{
    protected function casts(): array { return ['amount' => 'integer']; }
    public function creditSale(): BelongsTo { return $this->belongsTo(CreditSale::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
