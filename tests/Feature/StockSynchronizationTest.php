<?php

namespace Tests\Feature;

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
