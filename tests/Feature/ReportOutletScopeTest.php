<?php

namespace Tests\Feature;

use App\Enums\PaymentMethod;
use App\Enums\TransactionStatus;
use App\Enums\UserRole;
use App\Models\Shift;
use App\Models\Tenant;
use App\Models\TenantBranchRelationship;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReportOutletScopeTest extends TestCase
{
    use RefreshDatabase;

    public function test_central_dashboard_can_switch_between_central_branch_and_combined_scope(): void
    {
        [$central, $centralOwner, $branch, $branchOwner] = $this->network();
        $this->sale($central, $centralOwner, 30_000, now()->subMinute());
        $this->sale($branch, $branchOwner, 70_000, now());

        $this->actingAs($centralOwner)
            ->get(route('tenant.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.scope', 'central')
                ->where('summary.0.value', 'Rp 30.000')
                ->where('outletScope.can_filter', true)
                ->where('outletScope.options.0.value', 'central')
                ->where('outletScope.options.1.value', 'branches')
                ->where('outletScope.options.2.value', 'combined')
                ->where('outletScope.options.3.value', 'branch:'.$branch->id));

        $this->actingAs($centralOwner)
            ->get(route('tenant.dashboard', ['scope' => 'branch:'.$branch->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.scope', 'branch:'.$branch->id)
                ->where('summary.0.value', 'Rp 70.000'));

        $this->actingAs($centralOwner)
            ->get(route('tenant.dashboard', ['scope' => 'combined']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.scope', 'combined')
                ->where('summary.0.value', 'Rp 100.000'));
    }

    public function test_financial_report_aggregates_only_related_outlets_and_rejects_foreign_branch_scope(): void
    {
        [$central, $centralOwner, $branch, $branchOwner] = $this->network();
        $this->sale($central, $centralOwner, 20_000);
        $this->sale($branch, $branchOwner, 40_000);

        $foreign = Tenant::factory()->create(['tenant_type' => 'branch']);
        $foreignOwner = User::factory()->create(['tenant_id' => $foreign->id, 'role' => UserRole::Owner]);
        $this->sale($foreign, $foreignOwner, 900_000);

        $this->actingAs($centralOwner)
            ->get(route('tenant.reports.financial.index', [
                'period' => 'daily',
                'scope' => 'combined',
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.scope', 'combined')
                ->where('summary.revenue', 'Rp 60.000')
                ->where('summary.transactionCount', 2));

        $this->actingAs($centralOwner)
            ->get(route('tenant.reports.financial.index', [
                'period' => 'daily',
                'scope' => 'branch:'.$foreign->id,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.scope', 'central')
                ->where('summary.revenue', 'Rp 20.000'));
    }

    public function test_combined_transaction_and_shift_reports_show_outlet_identity_and_keep_branch_rows_read_only(): void
    {
        [$central, $centralOwner, $branch, $branchOwner] = $this->network();
        $centralSale = $this->sale($central, $centralOwner, 25_000, now()->subMinute());
        $branchSale = $this->sale($branch, $branchOwner, 35_000, now());

        $this->actingAs($centralOwner)
            ->get(route('tenant.reports.transactions.index', ['scope' => 'combined']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.scope', 'combined')
                ->where('transactions.total', 2)
                ->where('transactions.data.0.id', $branchSale->id)
                ->where('transactions.data.0.tenant.name', $branch->name)
                ->where('transactions.data.0.can_be_voided', false)
                ->where('transactions.data.1.id', $centralSale->id)
                ->where('transactions.data.1.tenant.name', $central->name)
                ->where('transactions.data.1.can_be_voided', true));

        $this->actingAs($centralOwner)
            ->get(route('tenant.reports.shifts.index', ['scope' => 'branches']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.scope', 'branches')
                ->where('shifts.total', 1)
                ->where('shifts.data.0.tenant.name', $branch->name));
    }

    public function test_central_can_open_related_branch_receipt_but_not_unrelated_receipt(): void
    {
        [, $centralOwner, $branch, $branchOwner] = $this->network();
        $branchSale = $this->sale($branch, $branchOwner, 35_000);

        $this->actingAs($centralOwner)
            ->get(route('tenant.transactions.receipt', $branchSale))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tenant/Receipts/Show')
                ->where('store.name', $branch->name));

        $foreign = Tenant::factory()->create();
        $foreignOwner = User::factory()->create(['tenant_id' => $foreign->id, 'role' => UserRole::Owner]);
        $foreignSale = $this->sale($foreign, $foreignOwner, 100_000);

        $this->actingAs($centralOwner)
            ->get(route('tenant.transactions.receipt', $foreignSale))
            ->assertForbidden();
    }

    /** @return array{Tenant, User, Tenant, User} */
    private function network(): array
    {
        $central = Tenant::factory()->create([
            'name' => 'Toko Pusat',
            'tenant_type' => 'central',
            'branch_network_code' => 'PUSAT-REPORT',
        ]);
        $centralOwner = User::factory()->create(['tenant_id' => $central->id, 'role' => UserRole::Owner]);
        $branch = Tenant::factory()->create(['name' => 'Cabang Selatan', 'tenant_type' => 'branch']);
        $branchOwner = User::factory()->create(['tenant_id' => $branch->id, 'role' => UserRole::Owner]);

        TenantBranchRelationship::query()->create([
            'parent_tenant_id' => $central->id,
            'branch_tenant_id' => $branch->id,
            'network_code_used' => $central->branch_network_code,
            'status' => 'active',
            'requested_at' => now()->subMonth(),
            'parent_approved_at' => now()->subMonth(),
            'admin_approved_at' => now()->subMonth(),
            'billing_effective_at' => now()->subDay(),
        ]);

        return [$central, $centralOwner, $branch, $branchOwner];
    }

    private function sale(Tenant $tenant, User $cashier, int $total, $createdAt = null): Transaction
    {
        $shift = Shift::factory()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $cashier->id,
            'opening_cash' => 0,
            'opened_at' => $createdAt ?? now(),
        ]);

        return Transaction::factory()->create([
            'tenant_id' => $tenant->id,
            'shift_id' => $shift->id,
            'user_id' => $cashier->id,
            'invoice_number' => 'TRX-'.$tenant->id.'-'.str_pad((string) $shift->id, 4, '0', STR_PAD_LEFT),
            'status' => TransactionStatus::Completed,
            'payment_method' => PaymentMethod::Cash,
            'subtotal' => $total,
            'additional_fee' => 0,
            'total' => $total,
            'created_at' => $createdAt ?? now(),
        ]);
    }
}
