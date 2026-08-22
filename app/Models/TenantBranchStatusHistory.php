<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_branch_relationship_id', 'from_status', 'to_status', 'changed_by', 'reason'])]
class TenantBranchStatusHistory extends Model
{
    public function relationship(): BelongsTo
    {
        return $this->belongsTo(TenantBranchRelationship::class, 'tenant_branch_relationship_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
