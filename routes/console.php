<?php

use App\Services\BranchNetworkService;
use App\Services\SubscriptionLifecycleService;
use App\Services\SupplierPayableReminderService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(fn () => app(BranchNetworkService::class)->syncDueTransitions())
    ->hourly()->name('branch-network-transitions')->withoutOverlapping();

Schedule::call(fn () => app(SubscriptionLifecycleService::class)->syncAll())
    ->hourly()->name('subscription-lifecycle-transitions')->withoutOverlapping();

Schedule::call(fn () => app(BranchNetworkService::class)->sendNetworkExpiryNotifications())
    ->dailyAt('08:00')->name('branch-network-expiry-notifications')->withoutOverlapping();

Schedule::call(fn () => app(SupplierPayableReminderService::class)->send())
    ->dailyAt('08:15')->name('supplier-payable-reminders')->withoutOverlapping();
