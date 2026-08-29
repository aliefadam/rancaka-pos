<?php

namespace App\Models;

use App\Enums\StockOpnameStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id', 'number', 'opname_date', 'status', 'note', 'snapshot_at', 'snapshot_movement_id',
    'created_by', 'started_by', 'started_at', 'submitted_by', 'submitted_at',
    'posted_by', 'posted_at', 'cancelled_by', 'cancelled_at', 'cancel_reason', 'review_note',
])]
class StockOpname extends Model
{
    protected function casts(): array
    {
        return [
            'opname_date' => 'date',
            'status' => StockOpnameStatus::class,
            'snapshot_at' => 'datetime',
            'started_at' => 'datetime',
            'submitted_at' => 'datetime',
            'posted_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(StockOpnameItem::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function starter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'started_by');
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function poster(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function canceller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }
}
