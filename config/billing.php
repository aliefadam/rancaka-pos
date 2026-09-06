<?php

return [
    'plan_name' => env('BILLING_PLAN_NAME', 'Rancaka POS Bulanan'),
    'monthly_price' => (int) env('BILLING_MONTHLY_PRICE', 149000),
    'trial_days' => (int) env('BILLING_TRIAL_DAYS', 7),
    'grace_period_days' => (int) env('BILLING_GRACE_PERIOD_DAYS', 7),
    'branch_network_enabled' => (bool) env('BILLING_BRANCH_NETWORK_ENABLED', true),
    'branch_monthly_price' => (int) env('BILLING_BRANCH_MONTHLY_PRICE', 20000),
    'bank_name' => env('BILLING_BANK_NAME', 'Bank belum diatur'),
    'bank_account' => env('BILLING_BANK_ACCOUNT', '-'),
    'bank_holder' => env('BILLING_BANK_HOLDER', 'Rancaka POS'),
];
