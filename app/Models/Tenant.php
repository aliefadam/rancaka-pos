<?php

namespace App\Models;

use App\Enums\UserRole;
use Database\Factories\TenantFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Storage;

#[Fillable([
    'name', 'email', 'phone', 'address', 'status',
    'logo_path', 'receipt_footer', 'receipt_size', 'auto_print_receipt',
    'tax_percentage', 'service_charge_percentage',
    'referred_by_sales_id', 'referral_code_used', 'referred_at',
    'tenant_type', 'branch_network_code',
])]
class Tenant extends Model
{
    /** @use HasFactory<TenantFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::created(function (Tenant $tenant) {
            $tenant->subscription()->create([
                'plan_code' => 'monthly',
                'plan_name' => config('billing.plan_name'),
                'price' => config('billing.monthly_price'),
                'status' => 'active',
                'is_grandfathered' => true,
            ]);
        });
    }

    protected $appends = ['logo_url'];

    protected function casts(): array
    {
        return [
            'auto_print_receipt' => 'boolean',
            'tax_percentage' => 'decimal:2',
            'service_charge_percentage' => 'decimal:2',
            'referred_at' => 'datetime',
        ];
    }

    protected function logoUrl(): Attribute
    {
        return Attribute::get(
            fn () => $this->logo_path ? Storage::disk('public')->url($this->logo_path) : null,
        );
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function owner(): HasOne
    {
        return $this->hasOne(User::class)->where('role', UserRole::Owner);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    public function roles(): HasMany
    {
        return $this->hasMany(Role::class);
    }

    public function rawMaterials(): HasMany
    {
        return $this->hasMany(RawMaterial::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function shifts(): HasMany
    {
        return $this->hasMany(Shift::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function activeShift(): HasOne
    {
        return $this->hasOne(Shift::class)->whereNull('closed_at');
    }

    public function subscription(): HasOne
    {
        return $this->hasOne(Subscription::class);
    }

    public function billingInvoices(): HasMany
    {
        return $this->hasMany(BillingInvoice::class);
    }

    public function suppliers(): HasMany
    {
        return $this->hasMany(Supplier::class);
    }

    public function purchases(): HasMany
    {
        return $this->hasMany(Purchase::class);
    }

    public function branchRelationships(): HasMany
    {
        return $this->hasMany(TenantBranchRelationship::class, 'parent_tenant_id');
    }

    public function parentRelationships(): HasMany
    {
        return $this->hasMany(TenantBranchRelationship::class, 'branch_tenant_id');
    }

    public function currentBranchRelationship(): HasOne
    {
        return $this->hasOne(TenantBranchRelationship::class, 'branch_tenant_id')
            ->whereIn('status', TenantBranchRelationship::OPEN_STATUSES)
            ->latestOfMany();
    }

    public function isCentral(): bool
    {
        return $this->tenant_type === 'central';
    }

    public function isBranch(): bool
    {
        return $this->tenant_type === 'branch';
    }

    public function referringSales(): BelongsTo
    {
        return $this->belongsTo(SalesProfile::class, 'referred_by_sales_id');
    }

    public function salesCommission(): HasOne
    {
        return $this->hasOne(SalesCommission::class);
    }
}
