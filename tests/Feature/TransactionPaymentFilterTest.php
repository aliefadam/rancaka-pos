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

        foreach (PaymentMethod::cases() as $method) {
            $this->actingAs($owner)
                ->get(route('tenant.reports.transactions.index', ['payment_method' => $method->value]))
                ->assertInertia(fn (Assert $page) => $page
                    ->where('filters.payment_method', $method->value)
                    ->has('transactions.data', 1)
                    ->where('transactions.data.0.payment_method', $method->value));
        }
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
