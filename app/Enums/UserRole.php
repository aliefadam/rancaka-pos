<?php

namespace App\Enums;

enum UserRole: string
{
    case Superadmin = 'superadmin';
    case Sales = 'sales';
    case Owner = 'owner';
    case Employee = 'employee';
}
