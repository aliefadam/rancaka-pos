<?php

namespace App\Enums;

enum DevelopmentTicketStatus: string
{
    case Pending = 'pending';
    case InProgress = 'in_progress';
    case Completed = 'completed';
    case Revision = 'revision';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Belum Dikerjakan',
            self::InProgress => 'Diproses',
            self::Completed => 'Selesai',
            self::Revision => 'Perlu Revisi',
        };
    }
}
