<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['sales_profile_id', 'tenant_id', 'billing_invoice_id', 'subscription_payment_id', 'base_amount', 'commission_type_snapshot', 'commission_rate_snapshot', 'commission_value_snapshot', 'commission_amount', 'status', 'approved_at', 'paid_at', 'paid_by', 'note'])]
class SalesCommission extends Model
{
    protected function casts(): array
    {
        return [
            'commission_rate_snapshot' => 'decimal:2',
            'commission_value_snapshot' => 'integer',
            'approved_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    public function salesProfile(): BelongsTo
    {
        return $this->belongsTo(SalesProfile::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(BillingInvoice::class, 'billing_invoice_id');
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPayment::class, 'subscription_payment_id');
    }

    public function payouts(): BelongsToMany
    {
        return $this->belongsToMany(CommissionPayout::class, 'commission_payout_items')->withTimestamps();
    }
}
