<?php

namespace App\Enums;

enum DevelopmentTicketPriority: string
{
    case Low = 'low';
    case Normal = 'normal';
    case High = 'high';
    case Urgent = 'urgent';

    public function label(): string
    {
        return match ($this) {
            self::Low => 'Rendah',
            self::Normal => 'Normal',
            self::High => 'Tinggi',
            self::Urgent => 'Urgent',
        };
    }
}
