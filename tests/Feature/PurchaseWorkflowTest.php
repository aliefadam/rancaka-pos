<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\User;
use App\Services\PurchaseService;
use App\Services\SupplierPaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_purchase_updates_moving_average_and_supplier_balance_end_to_end(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create(['tenant_id' => $tenant->id, 'role' => UserRole::Owner]);
        $category = Category::factory()->create(['tenant_id' => $tenant->id]);
        $product = Product::factory()->create(['tenant_id' => $tenant->id, 'category_id' => $category->id, 'stock' => 10, 'cost' => 1000]);
        $supplier = Supplier::create(['tenant_id' => $tenant->id, 'name' => 'Supplier Uji', 'is_active' => true]);

        $purchase = app(PurchaseService::class)->create($owner, [
            'supplier_id' => $supplier->id,
            'purchase_date' => today()->toDateString(),
            'payment_term' => 'credit',
            'due_date' => today()->addWeek()->toDateString(),
            'items' => [['item_type' => 'product', 'item_id' => $product->id, 'quantity' => 10, 'unit_cost' => 3000]],
            'discount_amount' => 0,
            'additional_cost_amount' => 0,
        ]);

        $this->assertSame(20, $product->fresh()->stock);
        $this->assertSame('2000.0000', $product->fresh()->cost);
        $this->assertSame(30000, $purchase->fresh()->balance_amount);

        $payment = app(SupplierPaymentService::class)->record($owner, $purchase, [
            'amount' => 10000, 'payment_date' => today()->toDateString(), 'payment_method' => 'cash',
        ]);
        $this->assertSame(20000, $purchase->fresh()->balance_amount);
        $this->assertSame(10000, $purchase->installments()->first()->fresh()->paid_amount);

        app(SupplierPaymentService::class)->void($owner, $payment, 'Salah nominal');
        $this->assertSame(30000, $purchase->fresh()->balance_amount);

        app(PurchaseService::class)->void($owner, $purchase, 'Pesanan dibatalkan supplier');
        $this->assertSame(10, $product->fresh()->stock);
        $this->assertSame('1000.0000', $product->fresh()->cost);
        $this->assertSame('void', $purchase->fresh()->document_status);
    }

    public function test_installment_down_payment_does_not_consume_future_schedule(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create(['tenant_id' => $tenant->id, 'role' => UserRole::Owner]);
        $category = Category::factory()->create(['tenant_id' => $tenant->id]);
        $product = Product::factory()->create(['tenant_id' => $tenant->id, 'category_id' => $category->id, 'stock' => 0, 'cost' => 0]);
        $supplier = Supplier::create(['tenant_id' => $tenant->id, 'name' => 'Supplier Cicilan', 'is_active' => true]);

        $purchase = app(PurchaseService::class)->create($owner, [
            'supplier_id' => $supplier->id, 'purchase_date' => today()->toDateString(),
            'payment_term' => 'installment', 'due_date' => today()->addMonth()->toDateString(),
            'initial_payment_amount' => 10000, 'initial_payment_method' => 'cash',
            'items' => [['item_type' => 'product', 'item_id' => $product->id, 'quantity' => 10, 'unit_cost' => 5000]],
            'installments' => [
                ['due_date' => today()->addWeeks(2)->toDateString(), 'amount' => 20000],
                ['due_date' => today()->addMonth()->toDateString(), 'amount' => 20000],
            ],
        ]);

        $this->assertSame(10000, $purchase->fresh()->paid_amount);
        $this->assertSame(40000, $purchase->fresh()->balance_amount);
        $this->assertSame(0, $purchase->installments()->sum('paid_amount'));
        $this->assertSame(40000, $purchase->installments()->sum('planned_amount'));
    }
}
