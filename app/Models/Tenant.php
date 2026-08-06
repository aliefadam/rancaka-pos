<?php

namespace App\Models;

use App\Enums\UserRole;
use Database\Factories\TenantFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Storage;

#[Fillable([
    'name', 'email', 'phone', 'address', 'status',
    'logo_path', 'receipt_footer', 'tax_percentage', 'service_charge_percentage',
])]
class Tenant extends Model
{
    /** @use HasFactory<TenantFactory> */
    use HasFactory;

    protected $appends = ['logo_url'];

    protected function casts(): array
    {
        return [
            'tax_percentage' => 'decimal:2',
            'service_charge_percentage' => 'decimal:2',
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

    public function activeShift(): HasOne
    {
        return $this->hasOne(Shift::class)->whereNull('closed_at');
    }
}
