<?php

namespace App\Enums;

enum UserRole: string
{
    case Superadmin = 'superadmin';
    case Owner = 'owner';
    case Employee = 'employee';
}
