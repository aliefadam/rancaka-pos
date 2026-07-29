<?php

namespace App\Enums;

enum StockMovementType: string
{
    case In = 'in';
    case Sale = 'sale';
    case Adjustment = 'adjustment';
}
