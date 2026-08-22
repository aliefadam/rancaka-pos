<?php

namespace Tests\Feature;

use App\Enums\PaymentMethod;
use App\Enums\StockMovementType;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\Shift;
use App\Models\Tenant;
use App\Models\User;
use App\Services\StockMovementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StockSynchronizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_rejects_aggregated_raw_material_shortage_without_changing_any_stock(): void
    {
        [$user, $category, $rawMaterial] = $this->inventory(rawMaterialStock: 3);
        $firstProduct = $this->product($category, 'Kopi Susu', 5, $rawMaterial, 2);
        $secondProduct = $this->product($category, 'Teh Susu', 5, $rawMaterial, 2);

        $this->actingAs($user)
            ->post(route('tenant.pos.checkout'), $this->payload([
                ['product_id' => $firstProduct->id, 'quantity' => 1],
                ['product_id' => $secondProduct->id, 'quantity' => 1],
            ]))
            ->assertSessionHasErrors('items');

        $this->assertSame(5, $firstProduct->fresh()->stock);
        $this->assertSame(5, $secondProduct->fresh()->stock);
        $this->assertSame('3.00', $rawMaterial->fresh()->stock);
        $this->assertDatabaseCount('transactions', 0);
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_checkout_decrements_product_and_raw_material_stock_together(): void
    {
        [$user, $category, $rawMaterial] = $this->inventory(rawMaterialStock: 10);
        $product = $this->product($category, 'Kopi Susu', 5, $rawMaterial, 1.5);

        $this->actingAs($user)
            ->post(route('tenant.pos.checkout'), $this->payload([
                ['product_id' => $product->id, 'quantity' => 2],
            ]))
            ->assertRedirect(route('tenant.pos.index'));

        $this->assertSame(3, $product->fresh()->stock);
        $this->assertSame('7.00', $rawMaterial->fresh()->stock);
        $this->assertDatabaseCount('transactions', 1);
        $this->assertDatabaseCount('stock_movements', 2);
        $this->assertDatabaseHas('transactions', [
            'amount_received' => 100000,
            'change_amount' => 70000,
        ]);
    }

    public function test_cash_checkout_rejects_insufficient_payment(): void
    {
        [$user, $category] = $this->inventory();
        $product = $this->product($category, 'Kopi Hitam', 5);
        $payload = $this->payload([
            ['product_id' => $product->id, 'quantity' => 1],
        ]);
        $payload['amount_received'] = 10000;

        $this->actingAs($user)
            ->post(route('tenant.pos.checkout'), $payload)
            ->assertSessionHasErrors('amount_received');

        $this->assertSame(5, $product->fresh()->stock);
        $this->assertDatabaseCount('transactions', 0);
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_online_checkout_is_recorded_without_cash_received(): void
    {
        [$user, $category] = $this->inventory();
        $product = $this->product($category, 'Pesanan Marketplace', 5);
        $payload = $this->payload([[
            'product_id' => $product->id,
            'quantity' => 1,
        ]]);
        $payload['payment_method'] = 'online';
        $payload['amount_received'] = null;

        $this->actingAs($user)
            ->post(route('tenant.pos.checkout'), $payload)
            ->assertRedirect(route('tenant.pos.index'));

        $this->assertDatabaseHas('transactions', [
            'payment_method' => PaymentMethod::Online->value,
            'amount_received' => null,
            'change_amount' => null,
            'total' => 15000,
        ]);
    }

    public function test_credit_initial_payment_is_recorded_in_the_active_shift(): void
    {
        [$user, $category] = $this->inventory();
        $product = $this->product($category, 'Pesanan Kredit', 5);
        $payload = $this->payload([[
            'product_id' => $product->id,
            'quantity' => 1,
        ]]);
        $payload['payment_method'] = 'credit';
        $payload['amount_received'] = null;
        $payload['credit_customer_name'] = 'Pelanggan Tempo';
        $payload['credit_initial_payment'] = 5000;

        $this->actingAs($user)
            ->post(route('tenant.pos.checkout'), $payload)
            ->assertRedirect(route('tenant.pos.index'));

        $shift = Shift::query()->sole();
        $this->assertDatabaseHas('credit_payments', [
            'shift_id' => $shift->id,
            'amount' => 5000,
            'note' => 'Pembayaran awal saat transaksi',
        ]);

        $this->actingAs($user)
            ->get(route('tenant.pos.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('shiftSummary.credit_sales', 15000)
                ->where('shiftSummary.debt_payments', 5000)
                ->where('shiftSummary.expected_cash', 105000));
    }

    public function test_checkout_applies_percentage_discount_before_tax_and_service_charge(): void
    {
        [$user, $category] = $this->inventory();
        $user->tenant->update([
            'tax_percentage' => 10,
            'service_charge_percentage' => 5,
        ]);
        $product = $this->product($category, 'Kopi Hitam', 5);
        $payload = $this->payload([
            ['product_id' => $product->id, 'quantity' => 2],
        ]);
        $payload['discount_type'] = 'percentage';
        $payload['discount_value'] = 10;
        $payload['additional_fee'] = 500;

        $this->actingAs($user)
            ->post(route('tenant.pos.checkout'), $payload)
            ->assertRedirect(route('tenant.pos.index'));

        $this->assertDatabaseHas('transactions', [
            'subtotal' => 30000,
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'discount_amount' => 3000,
            'tax_amount' => 2700,
            'service_charge_amount' => 1350,
            'additional_fee' => 500,
            'total' => 31550,
            'amount_received' => 100000,
            'change_amount' => 68450,
        ]);
    }

    public function test_checkout_applies_and_stores_discount_per_item(): void
    {
        [$user, $category] = $this->inventory();
        $product = $this->product($category, 'Kopi Hitam', 5);
        $payload = $this->payload([[
            'product_id' => $product->id,
            'quantity' => 2,
            'discount_type' => 'percentage',
            'discount_value' => 10,
        ]]);

        $this->actingAs($user)
            ->post(route('tenant.pos.checkout'), $payload)
            ->assertRedirect(route('tenant.pos.index'));

        $this->assertDatabaseHas('transaction_items', [
            'product_id' => $product->id,
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'discount_amount' => 3000,
            'subtotal' => 27000,
        ]);
        $this->assertDatabaseHas('transactions', [
            'subtotal' => 27000,
            'total' => 27000,
        ]);
    }

    public function test_checkout_rejects_discount_greater_than_subtotal(): void
    {
        [$user, $category] = $this->inventory();
        $product = $this->product($category, 'Kopi Hitam', 5);
        $payload = $this->payload([
            ['product_id' => $product->id, 'quantity' => 1],
        ]);
        $payload['discount_type'] = 'fixed';
        $payload['discount_value'] = 15001;

        $this->actingAs($user)
            ->post(route('tenant.pos.checkout'), $payload)
            ->assertSessionHasErrors('discount_value');

        $this->assertDatabaseCount('transactions', 0);
        $this->assertSame(5, $product->fresh()->stock);
    }

    public function test_pos_availability_uses_the_most_limited_stock_source(): void
    {
        [$user, $category, $rawMaterial] = $this->inventory(rawMaterialStock: 5);
        $this->product($category, 'Kopi Susu', 10, $rawMaterial, 2);

        $this->actingAs($user)
            ->get(route('tenant.pos.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('products.0.available_quantity', 2));
    }

    public function test_stock_service_never_allows_a_negative_balance(): void
    {
        [$user, $category] = $this->inventory();
        $product = $this->product($category, 'Kopi Hitam', 1);

        try {
            StockMovementService::record(
                $product,
                StockMovementType::Sale,
                -2,
                'Percobaan stok minus',
                $user->id,
            );

            $this->fail('Mutasi yang membuat stok minus seharusnya ditolak.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('stock', $exception->errors());
        }

        $this->assertSame(1, $product->fresh()->stock);
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_found_product_can_be_added_back_through_stock_adjustment(): void
    {
        [$user, $category] = $this->inventory();
        $product = $this->product($category, 'Basreng Daun Jeruk', 14);

        $this->actingAs($user)
            ->post(route('tenant.stock.products.adjustment'), [
                'product_id' => $product->id,
                'direction' => 'increase',
                'quantity' => 3,
                'reason' => 'Barang ditemukan',
            ])
            ->assertRedirect(route('tenant.stock.products.index'));

        $this->assertSame(17, $product->fresh()->stock);
        $this->assertDatabaseHas('stock_movements', [
            'stockable_type' => Product::class,
            'stockable_id' => $product->id,
            'type' => StockMovementType::Adjustment,
            'quantity' => 3,
            'note' => 'Penambahan: Barang ditemukan',
        ]);
    }

    public function test_raw_material_adjustment_can_add_or_subtract_stock(): void
    {
        [$user, , $rawMaterial] = $this->inventory(rawMaterialStock: 10);

        $this->actingAs($user)
            ->post(route('tenant.stock.raw-materials.adjustment'), [
                'raw_material_id' => $rawMaterial->id,
                'direction' => 'increase',
                'quantity' => 2.5,
                'reason' => 'Koreksi stok opname',
            ])
            ->assertRedirect(route('tenant.stock.raw-materials.index'));

        $this->actingAs($user)
            ->post(route('tenant.stock.raw-materials.adjustment'), [
                'raw_material_id' => $rawMaterial->id,
                'direction' => 'decrease',
                'quantity' => 1.25,
                'reason' => 'Selisih stok opname',
            ])
            ->assertRedirect(route('tenant.stock.raw-materials.index'));

        $this->assertSame('11.25', $rawMaterial->fresh()->stock);
        $this->assertDatabaseHas('stock_movements', [
            'stockable_type' => RawMaterial::class,
            'stockable_id' => $rawMaterial->id,
            'quantity' => 2.5,
            'note' => 'Penambahan: Koreksi stok opname',
        ]);
        $this->assertDatabaseHas('stock_movements', [
            'stockable_type' => RawMaterial::class,
            'stockable_id' => $rawMaterial->id,
            'quantity' => -1.25,
            'note' => 'Pengurangan: Selisih stok opname',
        ]);
    }

    /**
     * @return array{User, Category, RawMaterial}
     */
    private function inventory(float $rawMaterialStock = 10): array
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        Shift::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'opening_cash' => 100000,
            'opened_at' => now(),
        ]);
        $category = Category::create([
            'tenant_id' => $tenant->id,
            'name' => 'Minuman',
            'icon' => 'cup',
            'is_active' => true,
        ]);
        $rawMaterial = RawMaterial::create([
            'tenant_id' => $tenant->id,
            'name' => 'Susu',
            'unit' => 'liter',
            'stock' => $rawMaterialStock,
            'is_active' => true,
        ]);

        return [$user, $category, $rawMaterial];
    }

    private function product(
        Category $category,
        string $name,
        int $stock,
        ?RawMaterial $rawMaterial = null,
        float $recipeQuantity = 1,
    ): Product {
        $product = Product::create([
            'tenant_id' => $category->tenant_id,
            'category_id' => $category->id,
            'name' => $name,
            'price' => 15000,
            'track_stock' => true,
            'stock' => $stock,
            'is_active' => true,
        ]);

        if ($rawMaterial) {
            $product->rawMaterials()->attach($rawMaterial->id, ['quantity' => $recipeQuantity]);
        }

        return $product;
    }

    /**
     * @param  array<int, array{product_id: int, quantity: int}>  $items
     * @return array<string, mixed>
     */
    private function payload(array $items): array
    {
        return [
            'items' => $items,
            'payment_method' => 'cash',
            'additional_fee' => 0,
            'amount_received' => 100000,
        ];
    }
}
