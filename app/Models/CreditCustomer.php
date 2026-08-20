<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tenant_id', 'name'])]
class CreditCustomer extends Model
{
    public function tenant(): BelongsTo { return $this->belongsTo(Tenant::class); }
    public function creditSales(): HasMany { return $this->hasMany(CreditSale::class); }
}
