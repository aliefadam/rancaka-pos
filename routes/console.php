<?php

use App\Services\BranchNetworkService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(fn () => app(BranchNetworkService::class)->syncDueTransitions())
    ->hourly()->name('branch-network-transitions')->withoutOverlapping();

Schedule::call(fn () => app(BranchNetworkService::class)->sendNetworkExpiryNotifications())
    ->dailyAt('08:00')->name('branch-network-expiry-notifications')->withoutOverlapping();
