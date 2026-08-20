<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'email', 'phone', 'referral_code', 'commission_rate', 'status'])]
class SalesProfile extends Model
{
    protected function casts(): array
    {
        return ['commission_rate' => 'decimal:2'];
    }

    public static function normalizeReferralCode(?string $code): ?string
    {
        $normalized = strtoupper(trim((string) $code));

        return $normalized === '' ? null : $normalized;
    }

    public function tenants(): HasMany
    {
        return $this->hasMany(Tenant::class, 'referred_by_sales_id');
    }

    public function commissions(): HasMany
    {
        return $this->hasMany(SalesCommission::class);
    }

    public function payouts(): HasMany
    {
        return $this->hasMany(CommissionPayout::class);
    }
}
