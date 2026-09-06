<?php

namespace App\Models;

use Carbon\Carbon;
use Carbon\CarbonInterface;
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
        return in_array($this->lifecycleStatus(), ['grandfathered', 'trialing', 'active', 'grace_period'], true);
    }

    public function lifecycleStatus(?CarbonInterface $at = null): string
    {
        $now = $at ? Carbon::instance($at) : now();

        if ($this->is_grandfathered) {
            return 'grandfathered';
        }

        if ($this->status === 'pending_network') {
            return 'pending_network';
        }

        if (in_array($this->status, ['trialing', 'trial_expired'], true)) {
            return $this->trial_ends_at?->gt($now) ? 'trialing' : 'trial_expired';
        }

        if ($this->current_period_end) {
            if ($this->current_period_end->gt($now)) {
                return 'active';
            }

            return $now->lte($this->graceEndsAt()) ? 'grace_period' : 'suspended';
        }

        return in_array($this->status, ['active', 'grace_period', 'expired'], true)
            ? 'suspended'
            : $this->status;
    }

    public function graceEndsAt(): ?CarbonInterface
    {
        return $this->current_period_end?->copy()->addDays(config('billing.grace_period_days', 7));
    }

    /** @return array{status: string, label: string, ends_at: ?CarbonInterface, grace_ends_at: ?CarbonInterface, allows_access: bool} */
    public function lifecycleSummary(): array
    {
        $status = $this->lifecycleStatus();

        return [
            'status' => $status,
            'label' => match ($status) {
                'grandfathered' => 'Aktif tanpa batas',
                'trialing' => 'Masa trial',
                'trial_expired' => 'Trial habis',
                'active' => 'Langganan aktif',
                'grace_period' => 'Masa tenggang',
                'suspended' => 'Dibekukan',
                'pending_network' => 'Menunggu jaringan',
                default => ucfirst(str_replace('_', ' ', $status)),
            },
            'ends_at' => $status === 'trialing' || $status === 'trial_expired'
                ? $this->trial_ends_at
                : $this->current_period_end,
            'grace_ends_at' => $this->graceEndsAt(),
            'allows_access' => $this->allowsAccess(),
        ];
    }
}
