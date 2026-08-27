<?php

namespace Tests\Feature;

use App\Enums\PaymentMethod;
use App\Enums\StockMovementType;
use App\Enums\TransactionStatus;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\RawMaterial;
use App\Models\Role;
use App\Models\Shift;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PurchaseReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_payable_aging_uses_the_required_day_buckets(): void
    {
        $this->travelTo('2026-08-27 10:00:00');
        [$owner, $tenant] = $this->owner();
        $supplier = $this->supplier($tenant, 'Aging Supply');
        $this->purchase($owner, $supplier, 'PUR-NOT-DUE', '2026-08-01', '2026-08-27', 10000);
        $this->purchase($owner, $supplier, 'PUR-LATE-1', '2026-08-01', '2026-08-26', 20000);
        $this->purchase($owner, $supplier, 'PUR-LATE-7', '2026-08-01', '2026-08-20', 30000);
        $this->purchase($owner, $supplier, 'PUR-LATE-8', '2026-08-01', '2026-08-19', 40000);
        $this->purchase($owner, $supplier, 'PUR-LATE-30', '2026-07-01', '2026-07-28', 50000);
        $this->purchase($owner, $supplier, 'PUR-LATE-31', '2026-07-01', '2026-07-27', 60000);

        $this->actingAs($owner)
            ->get(route('tenant.supplier-payables.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('summary.aging.total.count', 6)
                ->where('summary.aging.total.amount', 210000)
                ->where('summary.aging.not_due.amount', 10000)
                ->where('summary.aging.overdue_1_7.count', 2)
                ->where('summary.aging.overdue_1_7.amount', 50000)
                ->where('summary.aging.overdue_8_30.count', 2)
                ->where('summary.aging.overdue_8_30.amount', 90000)
                ->where('summary.aging.overdue_over_30.count', 1)
                ->where('summary.aging.overdue_over_30.amount', 60000)
            );

        $this->actingAs($owner)
            ->get(route('tenant.reports.purchases.index', ['start_date' => '2026-08-01', 'end_date' => '2026-08-31']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tenant/Reports/Purchases/Index')
                ->where('aging.total.amount', 210000)
                ->where('aging.overdue_over_30.amount', 60000)
            );
    }

    public function test_purchase_report_calculates_supplier_item_valuation_price_and_actual_hpp(): void
    {
        $this->travelTo('2026-08-27 10:00:00');
        [$owner, $tenant] = $this->owner();
        $supplier = $this->supplier($tenant, 'Alpha Supply');
        $category = Category::factory()->create(['tenant_id' => $tenant->id]);
        $product = Product::factory()->create([
            'tenant_id' => $tenant->id, 'category_id' => $category->id, 'name' => 'Kopi Botol',
            'track_stock' => true, 'stock' => 10, 'cost' => 3000,
        ]);
        $material = RawMaterial::factory()->create([
            'tenant_id' => $tenant->id, 'name' => 'Biji Kopi', 'unit' => 'kg', 'stock' => 5, 'average_cost' => 2000,
        ]);
        $purchase = $this->purchase($owner, $supplier, 'PUR-ALPHA-001', '2026-08-10', '2026-09-10', 100000, 80000, 20000);
        $this->purchaseItem($purchase, $product, 'Kopi Botol', 'pcs', 10, 8000, 90000, 9000);
        $this->purchaseItem($purchase, $material, 'Biji Kopi', 'kg', 5, 2000, 10000, 2000);
        $this->payment($owner, $supplier, $purchase, 'PAY-ALPHA-001', '2026-08-15', 20000, 'valid');
        $this->payment($owner, $supplier, $purchase, 'PAY-ALPHA-VOID', '2026-08-16', 5000, 'void');

        $outside = $this->purchase($owner, $supplier, 'PUR-OUTSIDE', '2026-07-01', '2026-07-30', 700000);
        $this->purchaseItem($outside, $product, 'Kopi Botol', 'pcs', 100, 7000, 700000, 7000);

        [$otherOwner, $otherTenant] = $this->owner();
        $otherSupplier = $this->supplier($otherTenant, 'Tenant Lain');
        $this->purchase($otherOwner, $otherSupplier, 'PUR-HIDDEN', '2026-08-10', '2026-09-10', 900000);

        $transactionItem = $this->sale($owner, $product, 'TRX-HPP-001', '2026-08-20 12:00:00', 50000, 15000);
        $this->movement($owner, $product, $transactionItem, 15000);
        $this->movement($owner, $material, $transactionItem, 5000);

        $this->actingAs($owner)
            ->get(route('tenant.reports.purchases.index', ['start_date' => '2026-08-01', 'end_date' => '2026-08-31']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tenant/Reports/Purchases/Index')
                ->where('summary.purchase_count', 1)
                ->where('summary.purchase_total', 100000)
                ->where('summary.supplier_payments', 20000)
                ->where('summary.running_payable', 780000)
                ->where('summary.inventory_value', 40000)
                ->where('summary.actual_hpp', 20000)
                ->where('supplierBreakdown.0.supplier_name', 'Alpha Supply')
                ->where('supplierBreakdown.0.purchase_total', 100000)
                ->where('supplierBreakdown.0.period_payments', 20000)
                ->where('itemBreakdown.0.item_name', 'Kopi Botol')
                ->where('itemBreakdown.0.average_unit_cost', 9000)
                ->where('priceHistory.0.purchase_number', 'PUR-ALPHA-001')
                ->where('valuation.summary.products', 30000)
                ->where('valuation.summary.raw_materials', 10000)
                ->where('hpp.summary.revenue', 50000)
                ->where('hpp.summary.cost', 20000)
                ->where('hpp.summary.gross_profit', 30000)
                ->where('hpp.rows.0.invoice_number', 'TRX-HPP-001')
            );
    }

    public function test_report_filters_supplier_item_type_and_search_without_leaking_other_tenants(): void
    {
        $this->travelTo('2026-08-27 10:00:00');
        [$owner, $tenant] = $this->owner();
        $alpha = $this->supplier($tenant, 'Alpha Supply');
        $beta = $this->supplier($tenant, 'Beta Supply');
        $category = Category::factory()->create(['tenant_id' => $tenant->id]);
        $coffee = Product::factory()->create(['tenant_id' => $tenant->id, 'category_id' => $category->id, 'name' => 'Kopi Susu', 'track_stock' => true, 'stock' => 2, 'cost' => 5000]);
        $tea = Product::factory()->create(['tenant_id' => $tenant->id, 'category_id' => $category->id, 'name' => 'Teh Manis', 'track_stock' => true, 'stock' => 3, 'cost' => 4000]);
        $alphaPurchase = $this->purchase($owner, $alpha, 'PUR-ALPHA', '2026-08-10', '2026-09-10', 20000);
        $this->purchaseItem($alphaPurchase, $coffee, 'Kopi Susu', 'pcs', 2, 10000, 20000, 10000);
        $betaPurchase = $this->purchase($owner, $beta, 'PUR-BETA', '2026-08-10', '2026-09-10', 12000);
        $this->purchaseItem($betaPurchase, $tea, 'Teh Manis', 'pcs', 3, 4000, 12000, 4000);

        $this->actingAs($owner)
            ->get(route('tenant.reports.purchases.index', [
                'start_date' => '2026-08-01', 'end_date' => '2026-08-31',
                'supplier_id' => $alpha->id, 'item_type' => 'product', 'search' => 'Kopi',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.supplier_id', (string) $alpha->id)
                ->where('supplierBreakdown', fn ($rows) => $rows->count() === 1 && $rows->first()['supplier_name'] === 'Alpha Supply')
                ->where('itemBreakdown', fn ($rows) => $rows->count() === 1 && $rows->first()['item_name'] === 'Kopi Susu')
                ->where('valuation.rows', fn ($rows) => $rows->count() === 1 && $rows->first()['item_name'] === 'Kopi Susu')
                ->where('suppliers', fn ($rows) => $rows->count() === 2)
            );
    }

    public function test_report_csv_export_and_permission_are_enforced(): void
    {
        [$owner, $tenant] = $this->owner();
        $supplier = $this->supplier($tenant, 'CSV Supply');
        $category = Category::factory()->create(['tenant_id' => $tenant->id]);
        $product = Product::factory()->create(['tenant_id' => $tenant->id, 'category_id' => $category->id, 'name' => 'Produk CSV']);
        $purchase = $this->purchase($owner, $supplier, 'PUR-CSV-001', today()->toDateString(), today()->addWeek()->toDateString(), 25000);
        $this->purchaseItem($purchase, $product, 'Produk CSV', 'pcs', 5, 5000, 25000, 5000);
        $startDate = today()->startOfMonth()->toDateString();
        $endDate = today()->toDateString();

        $this->actingAs($owner)->get(route('tenant.reports.purchases.index', [
            'start_date' => $startDate, 'end_date' => $endDate,
        ]))->assertInertia(fn (Assert $page) => $page
            ->where('filters.start_date', $startDate)
            ->where('filters.end_date', $endDate)
            ->where('summary.purchase_count', 1)
            ->where('itemBreakdown.0.item_name', 'Produk CSV'));

        $response = $this->actingAs($owner)->get(route('tenant.reports.purchases.export', [
            'section' => 'items', 'start_date' => $startDate, 'end_date' => $endDate,
        ]));
        $response->assertOk()->assertDownload();
        $this->assertStringContainsString('Produk CSV', $response->streamedContent());

        $allowedRole = Role::create(['tenant_id' => $tenant->id, 'name' => 'Purchasing', 'permissions' => ['purchases.view']]);
        $allowed = User::factory()->create(['tenant_id' => $tenant->id, 'role' => UserRole::Employee, 'employee_role_id' => $allowedRole->id]);
        $denied = User::factory()->create(['tenant_id' => $tenant->id, 'role' => UserRole::Employee, 'employee_role_id' => null]);

        $this->actingAs($allowed)->get(route('tenant.reports.purchases.index'))->assertOk();
        $this->actingAs($denied)->get(route('tenant.reports.purchases.index'))->assertForbidden();
        $this->actingAs($denied)->get(route('tenant.reports.purchases.export', ['section' => 'items']))->assertForbidden();
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

    private function purchase(User $owner, Supplier $supplier, string $number, string $purchaseDate, ?string $dueDate, int $total, ?int $balance = null, int $paid = 0): Purchase
    {
        $balance ??= $total;

        return Purchase::create([
            'tenant_id' => $owner->tenant_id, 'supplier_id' => $supplier->id, 'number' => $number,
            'purchase_date' => $purchaseDate, 'payment_term' => $balance > 0 ? 'credit' : 'paid', 'due_date' => $dueDate,
            'items_subtotal' => $total, 'discount_amount' => 0, 'additional_cost_amount' => 0, 'total_amount' => $total,
            'paid_amount' => $paid, 'balance_amount' => $balance, 'document_status' => 'posted',
            'payment_status' => $balance === 0 ? 'paid' : ($paid > 0 ? 'partial' : 'unpaid'), 'created_by' => $owner->id,
        ]);
    }

    private function purchaseItem(Purchase $purchase, Product|RawMaterial $item, string $name, string $unit, float $quantity, float $unitCost, int $inventoryTotal, float $inventoryUnitCost): PurchaseItem
    {
        return PurchaseItem::create([
            'purchase_id' => $purchase->id, 'tenant_id' => $purchase->tenant_id,
            'purchasable_type' => $item->getMorphClass(), 'purchasable_id' => $item->id,
            'item_name' => $name, 'unit_name' => $unit, 'quantity' => $quantity, 'unit_cost' => $unitCost,
            'subtotal' => (int) round($quantity * $unitCost), 'allocated_discount' => 0,
            'allocated_additional_cost' => max(0, $inventoryTotal - (int) round($quantity * $unitCost)),
            'inventory_cost_total' => $inventoryTotal, 'inventory_unit_cost' => $inventoryUnitCost,
        ]);
    }

    private function payment(User $owner, Supplier $supplier, Purchase $purchase, string $number, string $date, int $amount, string $status): SupplierPayment
    {
        return SupplierPayment::create([
            'tenant_id' => $owner->tenant_id, 'supplier_id' => $supplier->id, 'purchase_id' => $purchase->id,
            'number' => $number, 'payment_date' => $date, 'amount' => $amount, 'payment_method' => 'cash',
            'created_by' => $owner->id, 'status' => $status,
        ]);
    }

    private function sale(User $owner, Product $product, string $invoice, string $createdAt, int $revenue, int $fallbackCost): TransactionItem
    {
        $shift = Shift::create(['tenant_id' => $owner->tenant_id, 'user_id' => $owner->id, 'opening_cash' => 0, 'opened_at' => $createdAt]);
        $transaction = Transaction::create([
            'tenant_id' => $owner->tenant_id, 'shift_id' => $shift->id, 'user_id' => $owner->id,
            'invoice_number' => $invoice, 'status' => TransactionStatus::Completed, 'payment_method' => PaymentMethod::Cash,
            'subtotal' => $revenue, 'additional_fee' => 0, 'total' => $revenue,
        ]);
        $transaction->forceFill(['created_at' => $createdAt, 'updated_at' => $createdAt])->saveQuietly();

        return TransactionItem::create([
            'transaction_id' => $transaction->id, 'product_id' => $product->id, 'product_name' => $product->name,
            'unit_price' => $revenue, 'cost_snapshot' => $fallbackCost, 'total_cost_snapshot' => $fallbackCost,
            'quantity' => 1, 'discount_amount' => 0, 'subtotal' => $revenue,
        ]);
    }

    private function movement(User $owner, Product|RawMaterial $stockable, TransactionItem $reference, int $cost): void
    {
        StockMovement::create([
            'tenant_id' => $owner->tenant_id, 'stockable_type' => $stockable->getMorphClass(), 'stockable_id' => $stockable->id,
            'type' => StockMovementType::Sale, 'quantity' => -1, 'user_id' => $owner->id,
            'reference_type' => $reference->getMorphClass(), 'reference_id' => $reference->id,
            'unit_cost_snapshot' => $cost, 'total_cost_snapshot' => $cost,
        ]);
    }
}
