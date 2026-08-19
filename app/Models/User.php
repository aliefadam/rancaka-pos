<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'username', 'password', 'role', 'tenant_id', 'employee_role_id'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'role' => UserRole::class,
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function employeeRole(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'employee_role_id');
    }

    public function isSuperadmin(): bool
    {
        return $this->role === UserRole::Superadmin;
    }

    public function isOwner(): bool
    {
        return $this->role === UserRole::Owner;
    }

    public function isEmployee(): bool
    {
        return $this->role === UserRole::Employee;
    }

    public function hasRestrictedCashierAccess(): bool
    {
        return $this->isEmployee() && $this->employee_role_id === null;
    }

    /**
     * @return array<int, string>
     */
    public function effectivePermissions(): array
    {
        if (! $this->isEmployee()) {
            return [];
        }

        if ($this->hasRestrictedCashierAccess()) {
            return ['transactions.view'];
        }

        return $this->employeeRole?->permissions ?? [];
    }

    public function hasPermission(string $permission): bool
    {
        if ($this->isOwner() || $this->isSuperadmin()) {
            return true;
        }

        return in_array($permission, $this->effectivePermissions(), true);
    }
}
