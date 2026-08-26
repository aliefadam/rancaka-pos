<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'parent_tenant_id', 'branch_tenant_id', 'network_code_used', 'status', 'requested_at',
    'parent_approved_at', 'parent_approved_by', 'admin_approved_at', 'admin_approved_by',
    'trial_starts_at', 'trial_ends_at', 'billing_effective_at', 'detach_effective_at',
    'requested_exit_at', 'reason', 'note',
])]
class TenantBranchRelationship extends Model
{
    public const OPEN_STATUSES = [
        'pending_parent_approval', 'pending_admin_approval', 'approved_pending_billing',
        'active', 'exit_requested', 'detached_pending',
    ];

    protected function casts(): array
    {
        return [
            'requested_at' => 'datetime', 'parent_approved_at' => 'datetime',
            'admin_approved_at' => 'datetime', 'trial_starts_at' => 'datetime',
            'trial_ends_at' => 'datetime', 'billing_effective_at' => 'datetime',
            'detach_effective_at' => 'datetime', 'requested_exit_at' => 'datetime',
        ];
    }

    public function parentTenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'parent_tenant_id');
    }

    public function branchTenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'branch_tenant_id');
    }

    public function histories(): HasMany
    {
        return $this->hasMany(TenantBranchStatusHistory::class);
    }

    public function catalogMigrations(): HasMany
    {
        return $this->hasMany(BranchCatalogMigration::class);
    }
}
