<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

class SupplierPayableAgingService
{
    /**
     * @return array{
     *   total: array{count: int, amount: int},
     *   not_due: array{count: int, amount: int},
     *   overdue_1_7: array{count: int, amount: int},
     *   overdue_8_30: array{count: int, amount: int},
     *   overdue_over_30: array{count: int, amount: int},
     *   without_due_date: array{count: int, amount: int}
     * }
     */
    public function summarize(Builder $query, ?Carbon $asOf = null): array
    {
        $asOf = ($asOf ?? today())->copy()->startOfDay();
        $buckets = [
            'total' => ['count' => 0, 'amount' => 0],
            'not_due' => ['count' => 0, 'amount' => 0],
            'overdue_1_7' => ['count' => 0, 'amount' => 0],
            'overdue_8_30' => ['count' => 0, 'amount' => 0],
            'overdue_over_30' => ['count' => 0, 'amount' => 0],
            'without_due_date' => ['count' => 0, 'amount' => 0],
        ];

        foreach ((clone $query)->get(['id', 'due_date', 'balance_amount']) as $purchase) {
            $amount = (int) $purchase->balance_amount;
            $buckets['total']['count']++;
            $buckets['total']['amount'] += $amount;

            if (! $purchase->due_date) {
                $buckets['not_due']['count']++;
                $buckets['not_due']['amount'] += $amount;
                $buckets['without_due_date']['count']++;
                $buckets['without_due_date']['amount'] += $amount;

                continue;
            }

            $dueDate = $purchase->due_date->copy()->startOfDay();
            if ($dueDate->greaterThanOrEqualTo($asOf)) {
                $buckets['not_due']['count']++;
                $buckets['not_due']['amount'] += $amount;

                continue;
            }

            $days = (int) $dueDate->diffInDays($asOf);
            $key = match (true) {
                $days <= 7 => 'overdue_1_7',
                $days <= 30 => 'overdue_8_30',
                default => 'overdue_over_30',
            };
            $buckets[$key]['count']++;
            $buckets[$key]['amount'] += $amount;
        }

        return $buckets;
    }
}
