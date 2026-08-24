<?php

namespace Tests\Feature;

use App\Enums\PaymentMethod;
use App\Enums\TransactionStatus;
use App\Enums\UserRole;
use App\Models\Shift;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TransactionPaymentFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_transaction_history_can_filter_every_payment_method(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $shift = Shift::create([
            'tenant_id' => $tenant->id,
            'user_id' => $owner->id,
            'opening_cash' => 0,
            'opened_at' => now(),
        ]);

        foreach (PaymentMethod::cases() as $method) {
            Transaction::create([
                'tenant_id' => $tenant->id,
                'shift_id' => $shift->id,
                'user_id' => $owner->id,
                'invoice_number' => 'TRX-'.strtoupper($method->value),
                'status' => TransactionStatus::Completed,
                'payment_method' => $method,
                'subtotal' => 10000,
                'total' => 10000,
                'additional_fee' => 0,
            ]);
        }

        foreach (PaymentMethod::cases() as $index => $method) {
            $this->actingAs($owner)
                ->get(route('tenant.reports.transactions.index', ['payment_method' => $method->value]))
                ->assertInertia(fn (Assert $page) => $page
                    ->where('filters.payment_method', $method->value)
                    ->has('transactions.data', 1)
                    ->where('transactions.data.0.payment_method', $method->value)
                    ->where("paymentSummary.{$index}.method", $method->value)
                    ->where("paymentSummary.{$index}.transaction_count", 1)
                    ->where("paymentSummary.{$index}.total_amount", 10000));
        }
    }

    public function test_payment_summary_follows_date_range_and_transaction_status_filter(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $shift = Shift::create([
            'tenant_id' => $tenant->id,
            'user_id' => $owner->id,
            'opening_cash' => 0,
            'opened_at' => now(),
        ]);

        $rows = [
            ['cash', TransactionStatus::Completed, 10000, now()->subDay()],
            ['qris', TransactionStatus::Completed, 20000, now()],
            ['online', TransactionStatus::Completed, 30000, now()->subDays(4)],
            ['credit', TransactionStatus::Voided, 40000, now()],
        ];

        foreach ($rows as $index => [$method, $status, $total, $createdAt]) {
            $transaction = Transaction::create([
                'tenant_id' => $tenant->id,
                'shift_id' => $shift->id,
                'user_id' => $owner->id,
                'invoice_number' => 'TRX-SUMMARY-'.$index,
                'status' => $status,
                'payment_method' => $method,
                'subtotal' => $total,
                'total' => $total,
                'additional_fee' => 0,
            ]);
            $transaction->forceFill(['created_at' => $createdAt, 'updated_at' => $createdAt])->saveQuietly();
        }

        $this->actingAs($owner)
            ->get(route('tenant.reports.transactions.index', [
                'date_from' => now()->subDays(2)->toDateString(),
                'date_to' => now()->toDateString(),
                'status' => TransactionStatus::Completed->value,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('transactions.data', 2)
                ->where('paymentSummary.0.method', PaymentMethod::Cash->value)
                ->where('paymentSummary.0.transaction_count', 1)
                ->where('paymentSummary.0.total_amount', 10000)
                ->where('paymentSummary.1.method', PaymentMethod::Qris->value)
                ->where('paymentSummary.1.transaction_count', 1)
                ->where('paymentSummary.1.total_amount', 20000)
                ->where('paymentSummary.2.total_amount', 0)
                ->where('paymentSummary.3.total_amount', 0));
    }

    public function test_invalid_payment_filter_is_ignored(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);

        $this->actingAs($owner)
            ->get(route('tenant.reports.transactions.index', ['payment_method' => 'invalid']))
            ->assertInertia(fn (Assert $page) => $page->where('filters.payment_method', ''));
    }
}
