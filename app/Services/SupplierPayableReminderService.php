<?php

namespace App\Services;

use App\Models\Purchase;
use App\Notifications\SupplierPayableNotification;

class SupplierPayableReminderService
{
    public function send(): int
    {
        $sent = 0;
        Purchase::query()->with(['tenant.owner', 'supplier'])->where('document_status', 'posted')->where('balance_amount', '>', 0)
            ->whereNotNull('due_date')->whereDate('due_date', '<=', today()->addDays(3))->chunkById(100, function ($purchases) use (&$sent) {
                foreach ($purchases as $purchase) {
                    if ($purchase->due_date->isBefore(today()) && $purchase->payment_status !== 'overdue') {
                        $purchase->update(['payment_status' => 'overdue']);
                        $purchase->installments()->whereIn('status', ['scheduled', 'partial'])->whereDate('due_date', '<', today())->update(['status' => 'overdue']);
                    }
                    $owner = $purchase->tenant?->owner;
                    if (! $owner || $owner->notifications()->whereDate('created_at', today())->where('data->purchase_id', $purchase->id)->exists()) {
                        continue;
                    }
                    $overdue = $purchase->due_date->isBefore(today());
                    $owner->notify(new SupplierPayableNotification([
                        'type' => $overdue ? 'supplier_payable_overdue' : 'supplier_payable_due',
                        'title' => $overdue ? 'Hutang supplier terlambat' : 'Hutang supplier segera jatuh tempo',
                        'message' => "{$purchase->number} · {$purchase->supplier->name} · Rp ".number_format($purchase->balance_amount, 0, ',', '.'),
                        'purchase_id' => $purchase->id, 'url' => route('tenant.purchases.show', $purchase),
                    ]));
                    $sent++;
                }
            });

        return $sent;
    }
}
