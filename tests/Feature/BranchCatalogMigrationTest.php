<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\TenantBranchRelationship;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BranchCatalogMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_branch_owner_can_copy_central_catalog_with_zero_stock_and_source_prices(): void
    {
        [$central, $branch, $relationship, $branchOwner] = $this->network();
        $category = Category::factory()->create([
            'tenant_id' => $central->id,
            'name' => 'Minuman',
            'icon' => 'fi-rr-coffee',
        ]);
        $product = Product::factory()->create([
            'tenant_id' => $central->id,
            'category_id' => $category->id,
            'name' => 'Kopi Susu',
            'price' => 18_000,
            'cost' => 12_000,
            'margin_percentage' => 50,
            'track_stock' => true,
            'stock' => 99,
        ]);
        $product->priceOptions()->where('is_default', true)->update([
            'name' => 'Reguler',
            'price' => 18_000,
        ]);
        $product->priceOptions()->create([
            'name' => 'Large',
            'price' => 22_000,
            'is_default' => false,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $this->actingAs($branchOwner)
            ->post(route('tenant.network.catalog.migrate', $relationship))
            ->assertSessionHasNoErrors()
            ->assertSessionHas('success', 'Migrasi selesai. 1 produk baru ditambahkan dengan stok 0.');

        $branchCategory = Category::query()->where('tenant_id', $branch->id)->sole();
        $branchProduct = Product::query()->where('tenant_id', $branch->id)->sole();

        $this->assertSame($category->id, $branchCategory->source_category_id);
        $this->assertSame($product->id, $branchProduct->source_product_id);
        $this->assertSame($branchCategory->id, $branchProduct->category_id);
        $this->assertSame(0, $branchProduct->stock);
        $this->assertSame(18_000, $branchProduct->price);
        $this->assertSame('12000.0000', $branchProduct->cost);
        $this->assertSame(['Reguler', 'Large'], $branchProduct->priceOptions()->pluck('name')->all());
        $this->assertDatabaseHas('branch_catalog_migrations', [
            'tenant_branch_relationship_id' => $relationship->id,
            'categories_created' => 1,
            'products_created' => 1,
        ]);
    }

    public function test_repeated_migration_preserves_branch_changes_and_only_adds_new_central_products(): void
    {
        [$central, $branch, $relationship, $branchOwner] = $this->network();
        $category = Category::factory()->create(['tenant_id' => $central->id, 'name' => 'Makanan']);
        $firstSource = Product::factory()->create([
            'tenant_id' => $central->id,
            'category_id' => $category->id,
            'name' => 'Roti Bakar',
            'price' => 15_000,
            'cost' => 8_000,
            'stock' => 20,
        ]);

        $this->actingAs($branchOwner)->post(route('tenant.network.catalog.migrate', $relationship));
        $branchProduct = Product::query()->where('tenant_id', $branch->id)->sole();
        $branchProduct->update([
            'name' => 'Roti Bakar Cabang',
            'price' => 17_000,
            'cost' => 9_000,
            'stock' => 7,
        ]);
        $firstSource->update(['name' => 'Roti Bakar Pusat Baru', 'price' => 19_000, 'cost' => 10_000]);

        $newSource = Product::factory()->create([
            'tenant_id' => $central->id,
            'category_id' => $category->id,
            'name' => 'Pisang Goreng',
            'price' => 12_000,
            'cost' => 6_000,
            'stock' => 30,
        ]);

        $this->actingAs($branchOwner)
            ->post(route('tenant.network.catalog.migrate', $relationship))
            ->assertSessionHasNoErrors();

        $this->assertSame(2, Product::query()->where('tenant_id', $branch->id)->count());
        $this->assertDatabaseHas('products', [
            'id' => $branchProduct->id,
            'source_product_id' => $firstSource->id,
            'name' => 'Roti Bakar Cabang',
            'price' => 17_000,
            'cost' => 9_000,
            'stock' => 7,
        ]);
        $this->assertDatabaseHas('products', [
            'tenant_id' => $branch->id,
            'source_product_id' => $newSource->id,
            'name' => 'Pisang Goreng',
            'stock' => 0,
        ]);
        $this->assertDatabaseCount('branch_catalog_migrations', 2);
        $this->assertDatabaseHas('branch_catalog_migrations', [
            'tenant_branch_relationship_id' => $relationship->id,
            'products_created' => 1,
            'products_unchanged' => 1,
        ]);
    }

    public function test_same_name_branch_product_is_linked_without_being_overwritten_or_duplicated(): void
    {
        [$central, $branch, $relationship, $branchOwner] = $this->network();
        $centralCategory = Category::factory()->create(['tenant_id' => $central->id, 'name' => 'Snack']);
        $source = Product::factory()->create([
            'tenant_id' => $central->id,
            'category_id' => $centralCategory->id,
            'name' => 'Keripik',
            'price' => 10_000,
            'cost' => 5_000,
        ]);
        $branchCategory = Category::factory()->create(['tenant_id' => $branch->id, 'name' => 'Snack']);
        $existing = Product::factory()->create([
            'tenant_id' => $branch->id,
            'category_id' => $branchCategory->id,
            'name' => 'Keripik',
            'price' => 13_000,
            'cost' => 7_000,
            'stock' => 4,
        ]);

        $this->actingAs($branchOwner)->post(route('tenant.network.catalog.migrate', $relationship));

        $this->assertSame(1, Product::query()->where('tenant_id', $branch->id)->count());
        $this->assertDatabaseHas('products', [
            'id' => $existing->id,
            'source_product_id' => $source->id,
            'price' => 13_000,
            'cost' => 7_000,
            'stock' => 4,
        ]);
        $this->assertSame($centralCategory->id, $branchCategory->fresh()->source_category_id);
    }

    public function test_migration_is_restricted_to_owner_of_an_approved_branch(): void
    {
        [$central, , $relationship, $branchOwner] = $this->network();
        $centralOwner = User::factory()->create(['tenant_id' => $central->id, 'role' => UserRole::Owner]);

        $this->actingAs($centralOwner)
            ->post(route('tenant.network.catalog.migrate', $relationship))
            ->assertForbidden();

        $relationship->update(['status' => 'exit_requested']);
        $this->actingAs($branchOwner)
            ->post(route('tenant.network.catalog.migrate', $relationship))
            ->assertStatus(422);
    }

    public function test_network_page_exposes_migration_warning_history(): void
    {
        [, , $relationship, $branchOwner] = $this->network();
        $this->actingAs($branchOwner)->post(route('tenant.network.catalog.migrate', $relationship));

        $this->actingAs($branchOwner)
            ->get(route('tenant.network.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tenant/Network/Index')
                ->where('catalogMigration.run_count', 1)
                ->where('catalogMigration.last_run.products_created', 0)
            );
    }

    /** @return array{Tenant, Tenant, TenantBranchRelationship, User} */
    private function network(): array
    {
        $central = Tenant::factory()->create([
            'tenant_type' => 'central',
            'branch_network_code' => 'PUSAT-01',
        ]);
        $branch = Tenant::factory()->create(['tenant_type' => 'branch']);
        $branchOwner = User::factory()->create([
            'tenant_id' => $branch->id,
            'role' => UserRole::Owner,
        ]);
        $relationship = TenantBranchRelationship::query()->create([
            'parent_tenant_id' => $central->id,
            'branch_tenant_id' => $branch->id,
            'network_code_used' => $central->branch_network_code,
            'status' => 'active',
            'requested_at' => now()->subMonth(),
            'parent_approved_at' => now()->subMonth(),
            'admin_approved_at' => now()->subMonth(),
            'billing_effective_at' => now()->subDay(),
        ]);

        return [$central, $branch, $relationship, $branchOwner];
    }
}
