<?php

namespace Tests\Feature;

use App\Enums\PaymentMethod;
use App\Enums\TransactionStatus;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Expense;
use App\Models\Product;
use App\Models\Role;
use App\Models\Shift;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TenantDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_uses_completed_transactions_from_the_authenticated_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $otherTenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $shift = Shift::factory()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $owner->id,
            'opened_at' => now()->startOfDay(),
        ]);
        $category = Category::factory()->create([
            'tenant_id' => $tenant->id,
        ]);
        $product = Product::factory()->create([
            'tenant_id' => $tenant->id,
            'category_id' => $category->id,
            'name' => 'Kopi Susu',
            'track_stock' => true,
            'is_active' => true,
            'stock' => 3,
        ]);

        $transaction = Transaction::factory()->create([
            'tenant_id' => $tenant->id,
            'shift_id' => $shift->id,
            'user_id' => $owner->id,
            'status' => TransactionStatus::Completed,
            'payment_method' => PaymentMethod::Cash,
            'subtotal' => 30000,
            'additional_fee' => 0,
            'total' => 30000,
            'created_at' => now(),
        ]);
        $transaction->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'unit_price' => 10000,
            'quantity' => 3,
            'subtotal' => 30000,
        ]);

        Transaction::factory()->create([
            'tenant_id' => $tenant->id,
            'shift_id' => $shift->id,
            'user_id' => $owner->id,
            'status' => TransactionStatus::Held,
            'total' => 90000,
            'created_at' => now(),
        ]);
        Expense::create([
            'tenant_id' => $tenant->id,
            'user_id' => $owner->id,
            'expense_date' => today(),
            'category' => 'Operasional',
            'amount' => 12000,
            'description' => 'Biaya kebersihan',
            'receipt_path' => 'expenses/test-receipt.pdf',
        ]);
        $otherOwner = User::factory()->create([
            'tenant_id' => $otherTenant->id,
            'role' => UserRole::Owner,
        ]);
        $otherShift = Shift::factory()->create([
            'tenant_id' => $otherTenant->id,
            'user_id' => $otherOwner->id,
            'opened_at' => now()->startOfDay(),
        ]);
        Transaction::factory()->create([
            'tenant_id' => $otherTenant->id,
            'shift_id' => $otherShift->id,
            'user_id' => $otherOwner->id,
            'status' => TransactionStatus::Completed,
            'total' => 100000,
            'created_at' => now(),
        ]);

        $response = $this->actingAs($owner)->get(route('tenant.dashboard'));

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Tenant/Dashboard')
            ->where('filters.period', 'today')
            ->where('summary.0.key', 'revenue')
            ->where('summary.0.value', 'Rp 30.000')
            ->where('summary.1.key', 'profit')
            ->where('summary.1.value', 'Rp 18.000')
            ->where('summary.2.value', '1')
            ->where('trendTotal', 'Rp 30.000')
            ->where('topProducts.0.name', 'Kopi Susu')
            ->where('topProducts.0.sold', 3)
            ->where('topProducts.0.revenue', 'Rp 30.000')
            ->where('paymentMethods.0.key', 'cash')
            ->where('paymentMethods.0.value', 'Rp 30.000')
            ->where('paymentMethods.0.percentage', 100)
            ->where('attentionItems.0.key', 'stock')
            ->where('capabilities.can_view_profit', true)
            ->where('activeShift.cashier', $owner->name)
        );
    }

    public function test_dashboard_period_filter_applies_to_summary_and_comparison(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create(['tenant_id' => $tenant->id, 'role' => UserRole::Owner]);
        $shift = Shift::factory()->create(['tenant_id' => $tenant->id, 'user_id' => $owner->id, 'opened_at' => now()]);

        foreach ([
            [now(), 10000],
            [now()->subDays(2), 20000],
            [now()->subDays(8), 10000],
        ] as [$createdAt, $total]) {
            Transaction::factory()->create([
                'tenant_id' => $tenant->id,
                'shift_id' => $shift->id,
                'user_id' => $owner->id,
                'status' => TransactionStatus::Completed,
                'payment_method' => PaymentMethod::Cash,
                'subtotal' => $total,
                'total' => $total,
                'created_at' => $createdAt,
            ]);
        }

        $this->actingAs($owner)
            ->get(route('tenant.dashboard', ['period' => '7days']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.period', '7days')
                ->where('summary.0.value', 'Rp 30.000')
                ->where('summary.0.comparison.percentage', 200)
                ->where('summary.0.comparison.label', '7 hari sebelumnya')
                ->has('salesTrend', 7));
    }

    public function test_employee_without_financial_permission_does_not_receive_profit_summary(): void
    {
        $tenant = Tenant::factory()->create();
        $role = Role::create([
            'tenant_id' => $tenant->id,
            'name' => 'Supervisor Kasir',
            'permissions' => ['dashboard.view'],
        ]);
        $employee = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Employee,
            'employee_role_id' => $role->id,
        ]);

        $this->actingAs($employee)
            ->get(route('tenant.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('summary.1.key', 'products')
                ->where('capabilities.can_view_profit', false)
                ->where('capabilities.can_view_financial_report', false));
    }
}
