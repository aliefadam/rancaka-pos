<?php

namespace App\Enums;

enum DevelopmentTicketType: string
{
    case Feature = 'feature';
    case Bug = 'bug';
    case Improvement = 'improvement';

    public function label(): string
    {
        return match ($this) {
            self::Feature => 'Fitur',
            self::Bug => 'Bug',
            self::Improvement => 'Improvement',
        };
    }
}
