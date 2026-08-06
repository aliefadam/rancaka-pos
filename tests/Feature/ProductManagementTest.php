<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_can_store_a_price_above_unsigned_integer_range(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $category = Category::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($owner)
            ->post(route('tenant.products.store'), [
                'name' => 'Produk Harga Tinggi',
                'category_id' => $category->id,
                'price' => 9_999_999_999,
                'track_stock' => false,
                'stock' => 0,
                'is_active' => true,
                'ingredients' => [],
            ])
            ->assertRedirect(route('tenant.products.index'));

        $this->assertDatabaseHas('products', [
            'tenant_id' => $tenant->id,
            'name' => 'Produk Harga Tinggi',
            'price' => 9_999_999_999,
        ]);
    }

    public function test_price_above_supported_application_limit_is_rejected(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $category = Category::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($owner)
            ->post(route('tenant.products.store'), [
                'name' => 'Produk Terlalu Mahal',
                'category_id' => $category->id,
                'price' => 1_000_000_000_000,
                'track_stock' => false,
                'stock' => 0,
                'is_active' => true,
                'ingredients' => [],
            ])
            ->assertSessionHasErrors('price');

        $this->assertDatabaseMissing('products', [
            'tenant_id' => $tenant->id,
            'name' => 'Produk Terlalu Mahal',
        ]);
    }
}
