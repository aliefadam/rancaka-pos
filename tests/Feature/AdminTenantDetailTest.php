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

class AdminTenantDetailTest extends TestCase
{
    use RefreshDatabase;

    public function test_superadmin_can_view_complete_tenant_report_with_isolated_sales_data(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Superadmin]);
        $tenant = Tenant::factory()->create(['name' => 'Kedai Utama']);
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
            'name' => 'Owner Kedai',
        ]);
        $shift = Shift::factory()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $owner->id,
            'opening_cash' => 100000,
            'opened_at' => now(),
        ]);
        $transaction = Transaction::factory()->create([
            'tenant_id' => $tenant->id,
            'shift_id' => $shift->id,
            'user_id' => $owner->id,
            'invoice_number' => 'INV-DETAIL-001',
            'status' => TransactionStatus::Completed,
            'payment_method' => PaymentMethod::Cash,
            'subtotal' => 50000,
            'total' => 50000,
            'created_at' => now(),
        ]);
        $transaction->items()->create([
            'product_name' => 'Kopi Susu',
            'unit_price' => 25000,
            'quantity' => 2,
            'subtotal' => 50000,
        ]);

        $otherTenant = Tenant::factory()->create();
        $otherOwner = User::factory()->create(['tenant_id' => $otherTenant->id, 'role' => UserRole::Owner]);
        $otherShift = Shift::factory()->create(['tenant_id' => $otherTenant->id, 'user_id' => $otherOwner->id, 'opened_at' => now()]);
        Transaction::factory()->create([
            'tenant_id' => $otherTenant->id,
            'shift_id' => $otherShift->id,
            'user_id' => $otherOwner->id,
            'invoice_number' => 'INV-OTHER',
            'status' => TransactionStatus::Completed,
            'payment_method' => PaymentMethod::Cash,
            'total' => 900000,
        ]);

        $this->actingAs($admin)
            ->get(route('admin.tenants.show', $tenant))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Tenants/Show')
                ->where('tenant.name', 'Kedai Utama')
                ->where('metrics.all_time_revenue', 50000)
                ->where('metrics.all_time_transactions', 1)
                ->where('metrics.items_sold', 2)
                ->where('accounts.0.name', 'Owner Kedai')
                ->where('topProducts.0.name', 'Kopi Susu')
                ->where('recentTransactions.0.invoice_number', 'INV-DETAIL-001')
                ->has('salesTrend', 30)
            );
    }

    public function test_tenant_owner_cannot_open_admin_tenant_detail(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);

        $this->actingAs($owner)
            ->get(route('admin.tenants.show', $tenant))
            ->assertForbidden();
    }
}
