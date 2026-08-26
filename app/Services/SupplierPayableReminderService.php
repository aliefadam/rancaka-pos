<?php

namespace App\Services;

use App\Models\Purchase;
use App\Notifications\SupplierPayableNotification;

class SupplierPayableReminderService
{
    public function send(): int
    {
        $sent = 0;
        $reminderThrough = today()->addDay();

        Purchase::query()->with(['tenant.owner', 'supplier', 'installments'])
            ->where('document_status', 'posted')
            ->where('balance_amount', '>', 0)
            ->whereHas('installments', fn ($query) => $query
                ->whereIn('status', ['scheduled', 'partial', 'overdue'])
                ->whereDate('due_date', '<=', $reminderThrough))
            ->chunkById(100, function ($purchases) use (&$sent) {
                foreach ($purchases as $purchase) {
                    $installment = $purchase->installments
                        ->whereIn('status', ['scheduled', 'partial', 'overdue'])
                        ->sortBy('due_date')
                        ->first();

                    if (! $installment) {
                        continue;
                    }

                    $dueDate = $installment->due_date;
                    $overdue = $dueDate->isBefore(today());

                    if ($overdue && $purchase->payment_status !== 'overdue') {
                        $purchase->update(['payment_status' => 'overdue']);
                        $purchase->installments()
                            ->whereIn('status', ['scheduled', 'partial'])
                            ->whereDate('due_date', '<', today())
                            ->update(['status' => 'overdue']);
                    }

                    $owner = $purchase->tenant?->owner;
                    if (! $owner || $owner->notifications()
                        ->whereDate('created_at', today())
                        ->where('data->purchase_id', $purchase->id)
                        ->exists()) {
                        continue;
                    }

                    $title = match (true) {
                        $overdue => 'Hutang supplier terlambat',
                        $dueDate->isToday() => 'Hutang supplier jatuh tempo hari ini',
                        default => 'Hutang supplier jatuh tempo besok',
                    };

                    $owner->notify(new SupplierPayableNotification([
                        'type' => $overdue ? 'supplier_payable_overdue' : 'supplier_payable_due',
                        'title' => $title,
                        'message' => "{$purchase->number} · {$purchase->supplier->name} · Rp ".number_format($purchase->balance_amount, 0, ',', '.'),
                        'purchase_id' => $purchase->id,
                        'url' => route('tenant.purchases.show', $purchase),
                    ]));
                    $sent++;
                }
            });

        return $sent;
    }
}
