<?php

namespace Tests\Feature;

use App\Enums\PaymentMethod;
use App\Enums\TransactionStatus;
use App\Enums\UserRole;
use App\Models\CreditCustomer;
use App\Models\CreditSale;
use App\Models\Shift;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CreditSaleSummaryFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_credit_summary_follows_search_and_status_filters(): void
    {
        [$owner, $tenant] = $this->owner();
        $coro = CreditCustomer::create(['tenant_id' => $tenant->id, 'name' => 'CORO']);
        $other = CreditCustomer::create(['tenant_id' => $tenant->id, 'name' => 'Pelanggan Lain']);

        $this->creditSale($owner, $coro, 'TRX-CORO-001', 200000, 0, 'outstanding');
        $this->creditSale($owner, $other, 'TRX-OTHER-001', 400000, 70000, 'outstanding');
        $this->creditSale($owner, $coro, 'TRX-CORO-PAID', 100000, 100000, 'paid');

        $this->actingAs($owner)
            ->get(route('tenant.credit-sales.index', ['search' => 'CORO']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('creditSales.total', 2)
                ->where('summary.outstanding', 200000)
                ->where('summary.customers', 1)
            );

        $this->actingAs($owner)
            ->get(route('tenant.credit-sales.index', ['search' => 'CORO', 'status' => 'paid']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('creditSales.total', 1)
                ->where('summary.outstanding', 0)
                ->where('summary.customers', 0)
            );
    }

    public function test_credit_summary_remains_scoped_to_the_current_tenant(): void
    {
        [$owner, $tenant] = $this->owner();
        $customer = CreditCustomer::create(['tenant_id' => $tenant->id, 'name' => 'Tenant Utama']);
        $this->creditSale($owner, $customer, 'TRX-OWN-001', 250000, 50000, 'outstanding');

        [$otherOwner, $otherTenant] = $this->owner();
        $otherCustomer = CreditCustomer::create(['tenant_id' => $otherTenant->id, 'name' => 'Tenant Lain']);
        $this->creditSale($otherOwner, $otherCustomer, 'TRX-OTHER-TENANT', 900000, 0, 'outstanding');

        $this->actingAs($owner)
            ->get(route('tenant.credit-sales.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('creditSales.total', 1)
                ->where('summary.outstanding', 200000)
                ->where('summary.customers', 1)
            );
    }

    /** @return array{User, Tenant} */
    private function owner(): array
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);

        return [$owner, $tenant];
    }

    private function creditSale(
        User $owner,
        CreditCustomer $customer,
        string $invoice,
        int $total,
        int $paid,
        string $status,
    ): CreditSale {
        $shift = Shift::firstOrCreate(
            ['tenant_id' => $owner->tenant_id, 'user_id' => $owner->id],
            ['opening_cash' => 0, 'opened_at' => now()],
        );
        $transaction = Transaction::create([
            'tenant_id' => $owner->tenant_id,
            'shift_id' => $shift->id,
            'user_id' => $owner->id,
            'invoice_number' => $invoice,
            'status' => TransactionStatus::Completed,
            'payment_method' => PaymentMethod::Credit,
            'subtotal' => $total,
            'discount_type' => 'nominal',
            'discount_value' => 0,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'service_charge_amount' => 0,
            'additional_fee' => 0,
            'total' => $total,
            'amount_received' => null,
            'change_amount' => 0,
        ]);

        return CreditSale::create([
            'tenant_id' => $owner->tenant_id,
            'transaction_id' => $transaction->id,
            'credit_customer_id' => $customer->id,
            'total_amount' => $total,
            'paid_amount' => $paid,
            'status' => $status,
        ]);
    }
}
