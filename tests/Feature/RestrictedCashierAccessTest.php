<?php

namespace Tests\Feature;

use App\Enums\PaymentMethod;
use App\Enums\TransactionStatus;
use App\Enums\UserRole;
use App\Models\Role;
use App\Models\Shift;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RestrictedCashierAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_without_role_only_gets_default_transaction_history_permission(): void
    {
        [$employee] = $this->cashierContext();

        $this->assertTrue($employee->hasRestrictedCashierAccess());
        $this->assertSame(['transactions.view'], $employee->effectivePermissions());
        $this->assertTrue($employee->hasPermission('transactions.view'));
        $this->assertFalse($employee->hasPermission('dashboard.view'));
        $this->assertFalse($employee->hasPermission('financial-reports.view'));
        $this->assertFalse($employee->hasPermission('shift-reports.view'));
    }

    public function test_employee_without_role_is_redirected_to_pos_and_cannot_open_business_reports(): void
    {
        [$employee] = $this->cashierContext();

        $this->actingAs($employee)->get(route('home'))
            ->assertRedirect(route('tenant.pos.index'));
        $this->actingAs($employee)->get(route('tenant.dashboard'))->assertForbidden();
        $this->actingAs($employee)->get(route('tenant.reports.financial.index'))->assertForbidden();
        $this->actingAs($employee)->get(route('tenant.reports.shifts.index'))->assertForbidden();
    }

    public function test_employee_without_role_only_sees_own_transactions_from_today(): void
    {
        [$employee, $otherEmployee, $shift] = $this->cashierContext();
        $visible = $this->transaction($shift, $employee, 'TRX-VISIBLE', now());
        $this->transaction($shift, $otherEmployee, 'TRX-OTHER', now());
        $this->transaction($shift, $employee, 'TRX-YESTERDAY', now()->subDay());

        $this->actingAs($employee)
            ->get(route('tenant.reports.transactions.index', ['date' => now()->subMonth()->toDateString()]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('limitedToOwnToday', true)
                ->where('filters.date', now()->toDateString())
                ->has('transactions.data', 1)
                ->where('transactions.data.0.id', $visible->id));
    }

    public function test_authorized_role_can_open_reports_and_see_full_transaction_history(): void
    {
        [$employee, $otherEmployee, $shift, $tenant] = $this->cashierContext();
        $role = Role::create([
            'tenant_id' => $tenant->id,
            'name' => 'Manajer',
            'permissions' => [
                'dashboard.view',
                'financial-reports.view',
                'shift-reports.view',
                'transactions.view',
            ],
        ]);
        $employee->update(['employee_role_id' => $role->id]);
        $this->transaction($shift, $employee, 'TRX-OWN', now()->subDay());
        $this->transaction($shift, $otherEmployee, 'TRX-OTHER', now());

        $this->actingAs($employee->fresh())->get(route('tenant.dashboard'))->assertOk();
        $this->actingAs($employee->fresh())->get(route('tenant.reports.financial.index'))->assertOk();
        $this->actingAs($employee->fresh())->get(route('tenant.reports.shifts.index'))->assertOk();
        $this->actingAs($employee->fresh())
            ->get(route('tenant.pos.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('shiftSummary.total_sales', 20000));
        $this->actingAs($employee->fresh())
            ->get(route('tenant.reports.transactions.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('limitedToOwnToday', false)
                ->has('transactions.data', 2));
    }

    public function test_pos_hides_shift_revenue_and_other_cashiers_held_transactions_without_role(): void
    {
        [$employee, $otherEmployee, $shift] = $this->cashierContext();
        $this->transaction($shift, $employee, 'TRX-SALE', now(), TransactionStatus::Completed, 75000);
        $ownHeld = $this->transaction($shift, $employee, 'TRX-OWN-HELD', now(), TransactionStatus::Held);
        $otherHeld = $this->transaction($shift, $otherEmployee, 'TRX-OTHER-HELD', now(), TransactionStatus::Held);

        $this->actingAs($employee)
            ->get(route('tenant.pos.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('shiftSummary', null)
                ->where('heldTransactionCount', 2)
                ->has('heldTransactions', 1)
                ->where('heldTransactions.0.id', $ownHeld->id));

        $this->actingAs($employee)
            ->post(route('tenant.shift.close'), ['closing_cash' => 1])
            ->assertSessionHasErrors([
                'closing_cash' => 'Shift tidak dapat ditutup karena masih ada 2 transaksi ditahan. Selesaikan atau batalkan transaksi tersebut terlebih dahulu.',
            ]);

        $ownHeld->delete();
        $otherHeld->delete();

        $this->actingAs($employee)
            ->post(route('tenant.shift.close'), ['closing_cash' => 1])
            ->assertSessionHasErrors([
                'closing_cash' => 'Kas aktual belum sesuai dengan saldo sistem atau nominal pembulatan Rp100. Hitung kembali uang tunai fisik di laci.',
            ]);
    }

    public function test_employee_receipts_are_limited_to_own_transactions_from_today(): void
    {
        [$employee, $otherEmployee, $shift] = $this->cashierContext();
        $ownToday = $this->transaction($shift, $employee, 'TRX-OWN-TODAY', now());
        $otherToday = $this->transaction($shift, $otherEmployee, 'TRX-OTHER-TODAY', now());
        $ownYesterday = $this->transaction($shift, $employee, 'TRX-OWN-YESTERDAY', now()->subDay());

        $this->actingAs($employee)
            ->get(route('tenant.transactions.receipt', $ownToday))
            ->assertOk();
        $this->actingAs($employee)
            ->get(route('tenant.transactions.receipt', $otherToday))
            ->assertForbidden();
        $this->actingAs($employee)
            ->get(route('tenant.transactions.receipt', $ownYesterday))
            ->assertForbidden();
    }

    /** @return array{User, User, Shift, Tenant} */
    private function cashierContext(): array
    {
        $tenant = Tenant::factory()->create();
        $employee = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Employee,
            'employee_role_id' => null,
        ]);
        $otherEmployee = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Employee,
            'employee_role_id' => null,
        ]);
        $shift = Shift::create([
            'tenant_id' => $tenant->id,
            'user_id' => $employee->id,
            'opening_cash' => 100000,
            'opened_at' => now(),
        ]);

        return [$employee, $otherEmployee, $shift, $tenant];
    }

    private function transaction(
        Shift $shift,
        User $employee,
        string $invoiceNumber,
        \DateTimeInterface $createdAt,
        TransactionStatus $status = TransactionStatus::Completed,
        int $total = 10000,
    ): Transaction {
        $transaction = Transaction::create([
            'tenant_id' => $shift->tenant_id,
            'shift_id' => $shift->id,
            'user_id' => $employee->id,
            'invoice_number' => $invoiceNumber,
            'status' => $status,
            'payment_method' => PaymentMethod::Cash,
            'subtotal' => $total,
            'additional_fee' => 0,
            'total' => $total,
        ]);
        $transaction->forceFill([
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ])->saveQuietly();

        return $transaction;
    }
}
