<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PurchaseSupplierStepOneTest extends TestCase
{
    use RefreshDatabase;

    public function test_supplier_detail_shows_purchase_payment_summary_and_tenant_scoped_histories(): void
    {
        [$owner, $tenant] = $this->owner();
        $supplier = $this->supplier($tenant, 'Sumber Makmur');
        $purchase = $this->purchase($owner, $supplier, 'PUR-OWN-001', '2026-08-12', '2026-08-30', 500000, 300000, 'partial');
        $this->payment($owner, $supplier, $purchase, 'PAY-OWN-001', 200000, 'valid');
        $this->payment($owner, $supplier, $purchase, 'PAY-VOID-001', 50000, 'void');

        [$otherOwner, $otherTenant] = $this->owner();
        $otherSupplier = $this->supplier($otherTenant, 'Supplier Tenant Lain');
        $otherPurchase = $this->purchase($otherOwner, $otherSupplier, 'PUR-OTHER-001', '2026-08-12', '2026-08-30', 900000, 900000, 'unpaid');
        $this->payment($otherOwner, $otherSupplier, $otherPurchase, 'PAY-OTHER-001', 100000, 'valid');

        $this->actingAs($owner)
            ->get(route('tenant.suppliers.show', $supplier))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tenant/Suppliers/Show')
                ->where('supplier.name', 'Sumber Makmur')
                ->where('summary.purchase_count', 1)
                ->where('summary.purchase_total', 500000)
                ->where('summary.payable_total', 300000)
                ->where('summary.paid_total', 200000)
                ->where('purchases.total', 1)
                ->where('purchases.data.0.number', 'PUR-OWN-001')
                ->where('payments.total', 2)
                ->where('payments.data.0.purchase.number', 'PUR-OWN-001')
            );

        $this->actingAs($owner)
            ->get(route('tenant.suppliers.show', $otherSupplier))
            ->assertForbidden();
    }

    public function test_purchase_filters_can_be_combined_and_pagination_keeps_the_query(): void
    {
        [$owner, $tenant] = $this->owner();
        $alpha = $this->supplier($tenant, 'Alpha Supply');
        $beta = $this->supplier($tenant, 'Beta Supply');

        $this->purchase($owner, $alpha, 'PUR-ALPHA-PAID', '2026-08-02', null, 100000, 0, 'paid');
        $target = $this->purchase($owner, $alpha, 'PUR-ALPHA-DUE', '2026-08-12', '2026-08-20', 200000, 200000, 'overdue', 'INV-ALPHA-77');
        $this->purchase($owner, $beta, 'PUR-BETA-DUE', '2026-08-12', '2026-08-20', 300000, 300000, 'overdue');

        for ($index = 1; $index <= 15; $index++) {
            $this->purchase($owner, $alpha, "PUR-ALPHA-{$index}", '2026-08-13', '2026-08-21', 1000, 1000, 'overdue', "INV-ALPHA-{$index}");
        }

        $query = [
            'search' => 'ALPHA',
            'supplier_id' => $alpha->id,
            'payment_status' => 'overdue',
            'purchase_from' => '2026-08-10',
            'purchase_to' => '2026-08-15',
            'due_from' => '2026-08-20',
            'due_to' => '2026-08-21',
        ];

        $this->actingAs($owner)
            ->get(route('tenant.purchases.index', $query))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tenant/Purchases/Index')
                ->where('purchases.total', 16)
                ->where('filters.supplier_id', (string) $alpha->id)
                ->where('filters.payment_status', 'overdue')
                ->where('purchases.next_page_url', fn ($url) => str_contains($url, 'supplier_id='.$alpha->id)
                    && str_contains($url, 'payment_status=overdue')
                    && str_contains($url, 'purchase_from=2026-08-10'))
                ->where('suppliers', fn ($suppliers) => $suppliers->count() === 2)
            );

        $this->actingAs($owner)
            ->get(route('tenant.purchases.index', [...$query, 'search' => $target->supplier_invoice_number]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('purchases.total', 1)
                ->where('purchases.data.0.number', 'PUR-ALPHA-DUE')
            );
    }

    public function test_payable_filters_and_summary_are_scoped_to_selected_supplier_and_dates(): void
    {
        $this->travelTo('2026-08-27 10:00:00');
        [$owner, $tenant] = $this->owner();
        $alpha = $this->supplier($tenant, 'Alpha Supply');
        $beta = $this->supplier($tenant, 'Beta Supply');
        $this->purchase($owner, $alpha, 'PUR-ALPHA-LATE', '2026-08-01', '2026-08-20', 100000, 100000, 'overdue');
        $this->purchase($owner, $alpha, 'PUR-ALPHA-NEXT', '2026-08-10', '2026-09-02', 200000, 200000, 'unpaid');
        $this->purchase($owner, $beta, 'PUR-BETA-LATE', '2026-08-01', '2026-08-19', 900000, 900000, 'overdue');

        [$otherOwner, $otherTenant] = $this->owner();
        $otherSupplier = $this->supplier($otherTenant, 'Hidden Supplier');
        $this->purchase($otherOwner, $otherSupplier, 'PUR-HIDDEN', '2026-08-01', '2026-08-18', 700000, 700000, 'overdue');

        $this->actingAs($owner)
            ->get(route('tenant.supplier-payables.index', [
                'supplier_id' => $alpha->id,
                'due_status' => 'overdue',
                'due_from' => '2026-08-01',
                'due_to' => '2026-09-30',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tenant/Payables/Index')
                ->where('payables.total', 1)
                ->where('payables.data.0.number', 'PUR-ALPHA-LATE')
                ->where('payables.data.0.is_overdue', true)
                ->where('summary.total', 300000)
                ->where('summary.overdue', 100000)
                ->where('summary.upcoming', 200000)
                ->where('filters.supplier_id', (string) $alpha->id)
                ->where('suppliers', fn ($suppliers) => $suppliers->count() === 2 && ! $suppliers->contains('name', 'Hidden Supplier'))
            );
    }

    public function test_cross_tenant_supplier_filter_is_rejected(): void
    {
        [$owner] = $this->owner();
        [, $otherTenant] = $this->owner();
        $otherSupplier = $this->supplier($otherTenant, 'Supplier Rahasia');

        $this->actingAs($owner)
            ->get(route('tenant.purchases.index', ['supplier_id' => $otherSupplier->id]))
            ->assertSessionHasErrors('supplier_id');

        $this->actingAs($owner)
            ->get(route('tenant.supplier-payables.index', ['supplier_id' => $otherSupplier->id]))
            ->assertSessionHasErrors('supplier_id');
    }

    /** @return array{User, Tenant} */
    private function owner(): array
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create(['tenant_id' => $tenant->id, 'role' => UserRole::Owner]);

        return [$owner, $tenant];
    }

    private function supplier(Tenant $tenant, string $name): Supplier
    {
        return Supplier::create(['tenant_id' => $tenant->id, 'name' => $name, 'is_active' => true]);
    }

    private function purchase(User $owner, Supplier $supplier, string $number, string $purchaseDate, ?string $dueDate, int $total, int $balance, string $status, ?string $invoice = null): Purchase
    {
        return Purchase::create([
            'tenant_id' => $owner->tenant_id,
            'supplier_id' => $supplier->id,
            'number' => $number,
            'supplier_invoice_number' => $invoice,
            'purchase_date' => $purchaseDate,
            'payment_term' => $balance > 0 ? 'credit' : 'paid',
            'due_date' => $dueDate,
            'items_subtotal' => $total,
            'discount_amount' => 0,
            'additional_cost_amount' => 0,
            'total_amount' => $total,
            'paid_amount' => $total - $balance,
            'balance_amount' => $balance,
            'document_status' => $status === 'void' ? 'void' : 'posted',
            'payment_status' => $status,
            'created_by' => $owner->id,
        ]);
    }

    private function payment(User $owner, Supplier $supplier, Purchase $purchase, string $number, int $amount, string $status): SupplierPayment
    {
        return SupplierPayment::create([
            'tenant_id' => $owner->tenant_id,
            'supplier_id' => $supplier->id,
            'purchase_id' => $purchase->id,
            'number' => $number,
            'payment_date' => '2026-08-15',
            'amount' => $amount,
            'payment_method' => 'cash',
            'created_by' => $owner->id,
            'status' => $status,
        ]);
    }
}
