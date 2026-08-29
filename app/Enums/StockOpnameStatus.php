<?php

namespace App\Enums;

enum StockOpnameStatus: string
{
    case Draft = 'draft';
    case Counting = 'counting';
    case Submitted = 'submitted';
    case Posted = 'posted';
    case Cancelled = 'cancelled';
}
