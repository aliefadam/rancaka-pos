<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['sales_profile_id', 'number', 'amount', 'status', 'paid_at', 'proof_path', 'note', 'processed_by'])]
class CommissionPayout extends Model
{
    protected $appends = ['proof_url'];

    protected function casts(): array
    {
        return ['paid_at' => 'datetime'];
    }

    public function salesProfile(): BelongsTo
    {
        return $this->belongsTo(SalesProfile::class);
    }

    public function commissions(): BelongsToMany
    {
        return $this->belongsToMany(SalesCommission::class, 'commission_payout_items')->withTimestamps();
    }

    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function getProofUrlAttribute(): ?string
    {
        return $this->proof_path ? route('admin.commission-payouts.proof', $this) : null;
    }
}
