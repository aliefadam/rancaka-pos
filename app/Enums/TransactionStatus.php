<?php

namespace App\Enums;

enum TransactionStatus: string
{
    case Held = 'held';
    case Completed = 'completed';
    case Voided = 'voided';
}
