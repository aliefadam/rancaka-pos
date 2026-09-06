<?php

namespace App\Services;

use App\Models\Subscription;

class SubscriptionLifecycleService
{
    public function sync(?Subscription $subscription): ?string
    {
        if (! $subscription) {
            return null;
        }

        $status = $subscription->lifecycleStatus();

        if ($status !== 'grandfathered' && $subscription->status !== $status) {
            $subscription->updateQuietly(['status' => $status]);
        }

        return $status;
    }

    public function syncAll(): void
    {
        Subscription::query()
            ->where('is_grandfathered', false)
            ->where('status', '!=', 'pending_network')
            ->chunkById(200, fn ($subscriptions) => $subscriptions->each(fn (Subscription $subscription) => $this->sync($subscription)));
    }
}
