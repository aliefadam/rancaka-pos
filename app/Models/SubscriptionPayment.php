<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

#[Fillable(['tenant_id', 'billing_invoice_id', 'amount', 'proof_path', 'note', 'status', 'rejection_reason', 'submitted_at', 'reviewed_at', 'reviewed_by'])]
class SubscriptionPayment extends Model
{
    protected $appends = ['proof_url'];

    protected function casts(): array
    {
        return ['submitted_at' => 'datetime', 'reviewed_at' => 'datetime'];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(BillingInvoice::class, 'billing_invoice_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function getProofUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->proof_path);
    }
}
