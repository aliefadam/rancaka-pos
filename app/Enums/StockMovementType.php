<?php

namespace App\Enums;

enum StockMovementType: string
{
    case In = 'in';
    case Sale = 'sale';
    case Adjustment = 'adjustment';
    case TransferOut = 'transfer_out';
    case TransferIn = 'transfer_in';
    case TransferReturn = 'transfer_return';
}
