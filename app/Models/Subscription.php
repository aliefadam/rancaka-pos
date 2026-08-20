<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tenant_id', 'plan_code', 'plan_name', 'price', 'status', 'is_grandfathered', 'trial_ends_at', 'current_period_start', 'current_period_end'])]
class Subscription extends Model
{
    protected function casts(): array
    {
        return ['is_grandfathered' => 'boolean', 'trial_ends_at' => 'datetime', 'current_period_start' => 'datetime', 'current_period_end' => 'datetime'];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(BillingInvoice::class);
    }

    public function allowsAccess(): bool
    {
        return $this->is_grandfathered
            || ($this->status === 'trialing' && $this->trial_ends_at?->isFuture())
            || ($this->status === 'active' && $this->current_period_end?->isFuture());
    }
}
