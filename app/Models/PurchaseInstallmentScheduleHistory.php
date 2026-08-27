<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'purchase_id', 'changed_by', 'before_schedule', 'after_schedule', 'reason'])]
class PurchaseInstallmentScheduleHistory extends Model
{
    protected function casts(): array
    {
        return [
            'before_schedule' => 'array',
            'after_schedule' => 'array',
        ];
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
