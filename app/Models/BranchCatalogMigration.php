<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'tenant_branch_relationship_id', 'parent_tenant_id', 'branch_tenant_id', 'initiated_by',
    'categories_created', 'categories_matched', 'products_created', 'products_matched',
    'products_unchanged', 'completed_at',
])]
class BranchCatalogMigration extends Model
{
    protected function casts(): array
    {
        return [
            'categories_created' => 'integer',
            'categories_matched' => 'integer',
            'products_created' => 'integer',
            'products_matched' => 'integer',
            'products_unchanged' => 'integer',
            'completed_at' => 'datetime',
        ];
    }

    public function relationship(): BelongsTo
    {
        return $this->belongsTo(TenantBranchRelationship::class, 'tenant_branch_relationship_id');
    }

    public function parentTenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'parent_tenant_id');
    }

    public function branchTenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'branch_tenant_id');
    }

    public function initiator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'initiated_by');
    }
}
