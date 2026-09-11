<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'number', 'source_tenant_id', 'destination_tenant_id', 'status', 'note', 'created_by',
    'dispatched_at', 'received_by', 'received_at', 'cancelled_by', 'cancelled_at',
    'rejected_by', 'rejected_at', 'resolution_note',
])]
class StockTransfer extends Model
{
    protected function casts(): array
    {
        return [
            'dispatched_at' => 'datetime', 'received_at' => 'datetime',
            'cancelled_at' => 'datetime', 'rejected_at' => 'datetime',
        ];
    }

    public function sourceTenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'source_tenant_id');
    }

    public function destinationTenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'destination_tenant_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function canceller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function rejecter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(StockTransferItem::class);
    }
}
