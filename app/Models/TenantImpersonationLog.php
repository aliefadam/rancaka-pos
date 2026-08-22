<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['actor_user_id', 'parent_tenant_id', 'branch_tenant_id', 'impersonated_user_id', 'started_at', 'ended_at', 'ip_address', 'user_agent'])]
class TenantImpersonationLog extends Model
{
    protected function casts(): array
    {
        return ['started_at' => 'datetime', 'ended_at' => 'datetime'];
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }

    public function parentTenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'parent_tenant_id');
    }

    public function branchTenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'branch_tenant_id');
    }
}
