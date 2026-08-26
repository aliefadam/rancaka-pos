<?php

namespace Tests\Feature;

use App\Enums\PaymentMethod;
use App\Enums\TransactionStatus;
use App\Enums\UserRole;
use App\Models\CreditCustomer;
use App\Models\CreditPayment;
use App\Models\CreditSale;
use App\Models\Shift;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ShiftReconciliationTest extends TestCase
{
    use RefreshDatabase;

    public function test_closing_shift_requires_actual_cash_count(): void
    {
        [$owner, $shift] = $this->openShift();

        $this->actingAs($owner)
            ->post(route('tenant.shift.close'), [])
            ->assertSessionHasErrors('closing_cash');

        $this->assertNull($shift->fresh()->closed_at);
    }

    public function test_shift_history_reconciles_opening_cash_cash_sales_and_actual_cash(): void
    {
        [$owner, $shift] = $this->openShift(openingCash: 500);
        $this->transaction($shift, $owner, PaymentMethod::Cash, 104000);
        $this->transaction($shift, $owner, PaymentMethod::Qris, 50000);
        $this->transaction($shift, $owner, PaymentMethod::Online, 75000);
        $creditTransaction = $this->transaction($shift, $owner, PaymentMethod::Credit, 25000);
        $this->transaction(
            $shift,
            $owner,
            PaymentMethod::Cash,
            999000,
            TransactionStatus::Voided,
        );
        $customer = CreditCustomer::create([
            'tenant_id' => $shift->tenant_id,
            'name' => 'Pelanggan Kredit',
        ]);
        $creditSale = CreditSale::create([
            'tenant_id' => $shift->tenant_id,
            'transaction_id' => $creditTransaction->id,
            'credit_customer_id' => $customer->id,
            'total_amount' => 25000,
            'paid_amount' => 0,
            'status' => 'outstanding',
        ]);

        $this->actingAs($owner)
            ->from(route('tenant.credit-sales.show', $creditSale))
            ->post(route('tenant.credit-sales.pay', $creditSale), [
                'amount' => 10000,
                'note' => 'Cicilan tunai saat shift',
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame($shift->id, CreditPayment::query()->sole()->shift_id);

        $this->actingAs($owner)
            ->get(route('tenant.pos.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('shiftSummary.cash_sales', 104000)
                ->where('shiftSummary.qris_sales', 50000)
                ->where('shiftSummary.online_sales', 75000)
                ->where('shiftSummary.credit_sales', 25000)
                ->where('shiftSummary.debt_payments', 10000)
                ->where('shiftSummary.total_sales', 254000)
                ->where('shiftSummary.expected_cash', 114500));

        $this->actingAs($owner)
            ->post(route('tenant.shift.close'), ['closing_cash' => 114400])
            ->assertSessionHasErrors('closing_cash');

        $this->assertNull($shift->fresh()->closed_at);

        $this->actingAs($owner)
            ->post(route('tenant.shift.close'), ['closing_cash' => 114500])
            ->assertRedirect(route('tenant.pos.index'));

        $this->assertSame(114500, $shift->fresh()->closing_cash);
        $this->assertNotNull($shift->fresh()->closed_at);

        $this->actingAs($owner)
            ->get(route('tenant.reports.shifts.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('shifts.data.0.cash_sales', 104000)
                ->where('shifts.data.0.qris_sales', 50000)
                ->where('shifts.data.0.online_sales', 75000)
                ->where('shifts.data.0.credit_sales', 25000)
                ->where('shifts.data.0.debt_payments', 10000)
                ->where('shifts.data.0.total_sales', 254000)
                ->where('shifts.data.0.expected_closing_cash', 114500)
                ->where('shifts.data.0.closing_cash', 114500)
                ->where('shifts.data.0.cash_difference', 0)
                ->where('shifts.data.0.transaction_count', 4));
    }

    public function test_shift_history_can_be_filtered_by_opening_date(): void
    {
        [$owner, $todayShift] = $this->openShift();
        $yesterdayShift = Shift::create([
            'tenant_id' => $todayShift->tenant_id,
            'user_id' => $owner->id,
            'opening_cash' => 50000,
            'opened_at' => now()->subDay(),
            'closed_at' => now()->subDay()->addHours(8),
        ]);

        $this->actingAs($owner)
            ->get(route('tenant.reports.shifts.index', [
                'date' => now()->toDateString(),
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.date', now()->toDateString())
                ->has('shifts.data', 1)
                ->where('shifts.data.0.id', $todayShift->id));

        $this->actingAs($owner)
            ->get(route('tenant.reports.shifts.index', [
                'date' => now()->subDay()->toDateString(),
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('shifts.data', 1)
                ->where('shifts.data.0.id', $yesterdayShift->id));
    }

    public function test_shift_can_be_closed_with_cash_rounded_down_to_one_hundred(): void
    {
        [$owner, $shift] = $this->openShift(openingCash: 12_417_360);

        $this->actingAs($owner)
            ->post(route('tenant.shift.close'), ['closing_cash' => 12_417_300])
            ->assertRedirect(route('tenant.pos.index'))
            ->assertSessionHasNoErrors();

        $this->assertSame(12_417_300, $shift->fresh()->closing_cash);
        $this->assertNotNull($shift->fresh()->closed_at);

        $this->actingAs($owner)
            ->get(route('tenant.reports.shifts.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('shifts.data.0.expected_closing_cash', 12_417_360)
                ->where('shifts.data.0.closing_cash', 12_417_300)
                ->where('shifts.data.0.cash_difference', -60)
                ->where('shifts.data.0.is_cash_rounding', true));
    }

    public function test_shift_still_rejects_cash_shortage_outside_the_rounding_amount(): void
    {
        [$owner, $shift] = $this->openShift(openingCash: 12_417_360);

        $this->actingAs($owner)
            ->post(route('tenant.shift.close'), ['closing_cash' => 12_417_200])
            ->assertSessionHasErrors('closing_cash');

        $this->assertNull($shift->fresh()->closed_at);
    }

    /**
     * @return array{User, Shift}
     */
    private function openShift(int $openingCash = 100000): array
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $shift = Shift::create([
            'tenant_id' => $tenant->id,
            'user_id' => $owner->id,
            'opening_cash' => $openingCash,
            'opened_at' => now(),
        ]);

        return [$owner, $shift];
    }

    private function transaction(
        Shift $shift,
        User $user,
        PaymentMethod $paymentMethod,
        int $total,
        TransactionStatus $status = TransactionStatus::Completed,
    ): Transaction {
        return Transaction::create([
            'tenant_id' => $shift->tenant_id,
            'shift_id' => $shift->id,
            'user_id' => $user->id,
            'invoice_number' => fake()->unique()->numerify('TRX-######'),
            'status' => $status,
            'payment_method' => $paymentMethod,
            'subtotal' => $total,
            'additional_fee' => 0,
            'total' => $total,
        ]);
    }
}
