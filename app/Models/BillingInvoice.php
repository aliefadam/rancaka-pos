<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tenant_id', 'subscription_id', 'number', 'status', 'amount', 'due_at', 'period_start', 'period_end', 'paid_at'])]
class BillingInvoice extends Model
{
    protected function casts(): array
    {
        return ['due_at' => 'datetime', 'period_start' => 'datetime', 'period_end' => 'datetime', 'paid_at' => 'datetime'];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SubscriptionPayment::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(BillingInvoiceItem::class);
    }
}
