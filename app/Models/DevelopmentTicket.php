<?php

namespace App\Models;

use App\Enums\DevelopmentTicketPriority;
use App\Enums\DevelopmentTicketStatus;
use App\Enums\DevelopmentTicketType;
use Database\Factories\DevelopmentTicketFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'number', 'title', 'type', 'priority', 'status', 'description',
    'tenant_id', 'created_by', 'assigned_to', 'target_date', 'completed_at',
])]
class DevelopmentTicket extends Model
{
    /** @use HasFactory<DevelopmentTicketFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'type' => DevelopmentTicketType::class,
            'priority' => DevelopmentTicketPriority::class,
            'status' => DevelopmentTicketStatus::class,
            'description' => 'array',
            'target_date' => 'date',
            'completed_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function updates(): HasMany
    {
        return $this->hasMany(DevelopmentTicketUpdate::class)->latest();
    }
}
