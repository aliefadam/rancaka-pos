<?php

namespace App\Models;

use App\Enums\DevelopmentTicketStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['development_ticket_id', 'user_id', 'from_status', 'to_status', 'note'])]
class DevelopmentTicketUpdate extends Model
{
    protected function casts(): array
    {
        return [
            'from_status' => DevelopmentTicketStatus::class,
            'to_status' => DevelopmentTicketStatus::class,
            'note' => 'array',
        ];
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(DevelopmentTicket::class, 'development_ticket_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
