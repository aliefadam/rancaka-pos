<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Product;
use App\Models\Shift;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProductPriceOptionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_product_can_be_created_with_multiple_prices_and_one_shared_stock(): void
    {
        [$owner, $category] = $this->storeContext();

        $this->actingAs($owner)
            ->post(route('tenant.products.store'), [
                'name' => 'Aqua',
                'category_id' => $category->id,
                'price' => 20000,
                'cost' => 12000,
                'margin_percentage' => 0,
                'track_stock' => true,
                'stock' => 200,
                'is_active' => true,
                'ingredients' => [],
                'price_options' => [
                    ['name' => 'Beli langsung', 'price' => 20000, 'is_default' => true, 'is_active' => true],
                    ['name' => 'Diantar', 'price' => 22000, 'is_default' => false, 'is_active' => true],
                    ['name' => 'Diantar jauh', 'price' => 23000, 'is_default' => false, 'is_active' => true],
                ],
            ])
            ->assertRedirect(route('tenant.products.index'));

        $product = Product::query()->where('name', 'Aqua')->sole();
        $this->assertSame(200, $product->stock);
        $this->assertSame(20000, $product->price);
        $this->assertCount(3, $product->priceOptions);
        $this->assertDatabaseHas('product_price_options', [
            'product_id' => $product->id,
            'name' => 'Diantar jauh',
            'price' => 23000,
            'is_default' => false,
        ]);
    }

    public function test_different_price_options_share_and_aggregate_the_main_product_stock(): void
    {
        [$owner, $category] = $this->storeContext(withShift: true);
        $product = $this->aqua($category, stock: 5);
        [$direct, $delivery] = $product->priceOptions;

        $this->actingAs($owner)
            ->post(route('tenant.pos.checkout'), $this->checkoutPayload([
                ['product_id' => $product->id, 'price_option_id' => $direct->id, 'quantity' => 2],
                ['product_id' => $product->id, 'price_option_id' => $delivery->id, 'quantity' => 3],
            ]))
            ->assertRedirect(route('tenant.pos.index'));

        $this->assertSame(0, $product->fresh()->stock);
        $this->assertDatabaseCount('stock_movements', 2);
        $this->assertDatabaseHas('transaction_items', [
            'product_id' => $product->id,
            'product_price_option_id' => $direct->id,
            'price_option_name' => 'Beli langsung',
            'unit_price' => 20000,
            'quantity' => 2,
        ]);
        $this->assertDatabaseHas('transaction_items', [
            'product_id' => $product->id,
            'product_price_option_id' => $delivery->id,
            'price_option_name' => 'Diantar',
            'unit_price' => 22000,
            'quantity' => 3,
        ]);
        $this->assertDatabaseHas('transactions', ['subtotal' => 106000, 'total' => 106000]);
    }

    public function test_checkout_rejects_combined_quantities_above_main_stock(): void
    {
        [$owner, $category] = $this->storeContext(withShift: true);
        $product = $this->aqua($category, stock: 4);
        [$direct, $delivery] = $product->priceOptions;

        $this->actingAs($owner)
            ->post(route('tenant.pos.checkout'), $this->checkoutPayload([
                ['product_id' => $product->id, 'price_option_id' => $direct->id, 'quantity' => 3],
                ['product_id' => $product->id, 'price_option_id' => $delivery->id, 'quantity' => 2],
            ]))
            ->assertSessionHasErrors('items');

        $this->assertSame(4, $product->fresh()->stock);
        $this->assertDatabaseCount('transactions', 0);
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_price_snapshot_receipt_and_report_remain_historical_after_price_changes(): void
    {
        [$owner, $category] = $this->storeContext(withShift: true);
        $product = $this->aqua($category, stock: 5);
        $delivery = $product->priceOptions->last();

        $this->actingAs($owner)
            ->post(route('tenant.pos.checkout'), $this->checkoutPayload([
                ['product_id' => $product->id, 'price_option_id' => $delivery->id, 'quantity' => 1],
            ]))
            ->assertRedirect(route('tenant.pos.index'));

        $transaction = Transaction::query()->sole();
        $delivery->update(['name' => 'Antar area kota', 'price' => 25000]);

        $this->actingAs($owner)
            ->get(route('tenant.transactions.receipt', $transaction))
            ->assertInertia(fn (Assert $page) => $page
                ->where('sale.items.0.product_name', 'Aqua')
                ->where('sale.items.0.price_option_name', 'Diantar')
                ->where('sale.items.0.unit_price', 22000));

        $this->actingAs($owner)
            ->get(route('tenant.reports.financial.index', ['period' => 'daily', 'date' => now()->toDateString()]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('priceOptionSales.0.product_name', 'Aqua')
                ->where('priceOptionSales.0.price_option_name', 'Diantar')
                ->where('priceOptionSales.0.unit_price', 22000)
                ->where('priceOptionSales.0.sold', 1));
    }

    public function test_inactive_price_option_cannot_be_used_for_a_new_sale(): void
    {
        [$owner, $category] = $this->storeContext(withShift: true);
        $product = $this->aqua($category, stock: 5);
        $delivery = $product->priceOptions->last();
        $delivery->update(['is_active' => false]);

        $this->actingAs($owner)
            ->post(route('tenant.pos.checkout'), $this->checkoutPayload([
                ['product_id' => $product->id, 'price_option_id' => $delivery->id, 'quantity' => 1],
            ]))
            ->assertSessionHasErrors('items');

        $this->assertSame(5, $product->fresh()->stock);
    }

    /** @return array{User, Category} */
    private function storeContext(bool $withShift = false): array
    {
        $tenant = Tenant::factory()->create(['tax_percentage' => 0, 'service_charge_percentage' => 0]);
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $category = Category::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Minuman',
            'is_active' => true,
        ]);

        if ($withShift) {
            Shift::create([
                'tenant_id' => $tenant->id,
                'user_id' => $owner->id,
                'opening_cash' => 100000,
                'opened_at' => now(),
            ]);
        }

        return [$owner, $category];
    }

    private function aqua(Category $category, int $stock): Product
    {
        $product = Product::create([
            'tenant_id' => $category->tenant_id,
            'category_id' => $category->id,
            'name' => 'Aqua',
            'price' => 20000,
            'cost' => 12000,
            'margin_percentage' => 66.67,
            'track_stock' => true,
            'stock' => $stock,
            'is_active' => true,
        ]);
        $product->priceOptions()->createMany([
            ['name' => 'Beli langsung', 'price' => 20000, 'is_default' => true, 'is_active' => true, 'sort_order' => 0],
            ['name' => 'Diantar', 'price' => 22000, 'is_default' => false, 'is_active' => true, 'sort_order' => 1],
        ]);

        return $product->load('priceOptions');
    }

    /** @param array<int, array<string, int>> $items */
    private function checkoutPayload(array $items): array
    {
        return [
            'items' => $items,
            'payment_method' => 'cash',
            'additional_fee' => 0,
            'amount_received' => 200000,
        ];
    }
}
