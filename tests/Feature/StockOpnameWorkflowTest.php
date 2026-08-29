<?php

namespace Tests\Feature;

use App\Enums\StockMovementType;
use App\Enums\StockOpnameStatus;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\StockMovement;
use App\Models\Tenant;
use App\Models\User;
use App\Services\StockMovementService;
use App\Services\StockOpnameService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StockOpnameWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_session_snapshots_all_inventory_and_prevents_another_active_session(): void
    {
        [$owner, $product, $material] = $this->inventory();
        $service = app(StockOpnameService::class);

        $opname = $service->create($owner, [
            'opname_date' => today()->toDateString(),
            'note' => 'Opname bulanan',
        ]);

        $this->assertSame(StockOpnameStatus::Draft, $opname->status);
        $this->assertCount(2, $opname->items);
        $this->assertDatabaseHas('stock_opname_items', [
            'stock_opname_id' => $opname->id,
            'stockable_type' => Product::class,
            'stockable_id' => $product->id,
            'system_stock_snapshot' => 10,
            'average_cost_snapshot' => 1_000,
        ]);
        $this->assertDatabaseHas('stock_opname_items', [
            'stock_opname_id' => $opname->id,
            'stockable_type' => RawMaterial::class,
            'stockable_id' => $material->id,
            'system_stock_snapshot' => 5,
            'average_cost_snapshot' => 2_000,
        ]);

        $this->expectException(ValidationException::class);
        $service->create($owner, ['opname_date' => today()->toDateString()]);
    }

    public function test_running_transactions_are_reconciled_and_preserved_when_owner_posts(): void
    {
        [$owner, $product, $material] = $this->inventory();
        $service = app(StockOpnameService::class);
        $opname = $service->create($owner, ['opname_date' => today()->toDateString()]);
        $service->start($owner, $opname);

        StockMovementService::record($product, StockMovementType::Sale, -2, 'Penjualan saat opname', $owner->id);
        StockMovementService::record($material, StockMovementType::In, 3, 'Pembelian saat opname', $owner->id, ['unit_cost' => 3_000]);

        $productItem = $opname->items()->where('stockable_type', Product::class)->firstOrFail();
        $materialItem = $opname->items()->where('stockable_type', RawMaterial::class)->firstOrFail();
        $service->saveCounts($owner, $opname, [
            ['id' => $productItem->id, 'physical_stock' => 7],
            ['id' => $materialItem->id, 'physical_stock' => 10],
        ]);

        $productItem->refresh();
        $materialItem->refresh();
        $this->assertSame('8.0000', $productItem->expected_stock_at_count);
        $this->assertSame('-1.0000', $productItem->variance_quantity);
        $this->assertSame('-1000.0000', $productItem->variance_value);
        $this->assertSame('8.0000', $materialItem->expected_stock_at_count);
        $this->assertSame('2.0000', $materialItem->variance_quantity);
        $this->assertSame('2375.0000', $materialItem->average_cost_at_count);
        $this->assertSame('4750.0000', $materialItem->variance_value);

        $service->submit($owner, $opname);
        StockMovementService::record($product->fresh(), StockMovementType::Sale, -1, 'Penjualan setelah hitung', $owner->id);
        StockMovementService::record($material->fresh(), StockMovementType::Sale, -1, 'Pemakaian setelah hitung', $owner->id);
        $service->post($owner, $opname);

        $this->assertSame(6, $product->fresh()->stock);
        $this->assertSame('9.00', $material->fresh()->stock);
        $this->assertSame(StockOpnameStatus::Posted, $opname->fresh()->status);
        $this->assertDatabaseHas('stock_movements', [
            'stockable_type' => Product::class,
            'stockable_id' => $product->id,
            'reference_type' => $productItem::class,
            'reference_id' => $productItem->id,
            'quantity' => -1,
        ]);
        $this->assertDatabaseHas('stock_movements', [
            'stockable_type' => RawMaterial::class,
            'stockable_id' => $material->id,
            'reference_type' => $materialItem::class,
            'reference_id' => $materialItem->id,
            'quantity' => 2,
        ]);
    }

    public function test_submit_requires_every_item_to_be_counted(): void
    {
        [$owner] = $this->inventory();
        $service = app(StockOpnameService::class);
        $opname = $service->create($owner, ['opname_date' => today()->toDateString()]);
        $service->start($owner, $opname);
        $first = $opname->items()->firstOrFail();
        $service->saveCounts($owner, $opname, [['id' => $first->id, 'physical_stock' => 1]]);

        try {
            $service->submit($owner, $opname);
            $this->fail('Sesi dengan item belum dihitung seharusnya ditolak.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('items', $exception->errors());
        }

        $this->assertSame(StockOpnameStatus::Counting, $opname->fresh()->status);
    }

    public function test_post_is_idempotent_and_does_not_create_duplicate_adjustments(): void
    {
        [$owner] = $this->inventory();
        $service = app(StockOpnameService::class);
        $opname = $service->create($owner, ['opname_date' => today()->toDateString()]);
        $service->start($owner, $opname);
        $service->saveCounts($owner, $opname, $opname->items->map(fn ($item) => [
            'id' => $item->id,
            'physical_stock' => (float) $item->system_stock_snapshot + 1,
        ])->all());
        $service->submit($owner, $opname);
        $service->post($owner, $opname);
        $movementCount = StockMovement::whereHasMorph('reference', [$opname->items->first()::class])->count();

        try {
            $service->post($owner, $opname);
            $this->fail('Posting kedua seharusnya ditolak.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('opname', $exception->errors());
        }

        $this->assertSame($movementCount, StockMovement::whereHasMorph('reference', [$opname->items->first()::class])->count());
    }

    public function test_other_tenant_cannot_view_stock_opname(): void
    {
        [$owner] = $this->inventory();
        $opname = app(StockOpnameService::class)->create($owner, ['opname_date' => today()->toDateString()]);
        $otherTenant = Tenant::factory()->create();
        $otherOwner = User::factory()->create(['tenant_id' => $otherTenant->id, 'role' => UserRole::Owner]);

        $this->actingAs($otherOwner)
            ->get(route('tenant.stock-opnames.show', $opname))
            ->assertNotFound();
    }

    public function test_active_session_blocks_direct_master_stock_change(): void
    {
        [$owner, , $material] = $this->inventory();
        app(StockOpnameService::class)->create($owner, ['opname_date' => today()->toDateString()]);

        $this->actingAs($owner)
            ->from(route('tenant.raw-materials.index'))
            ->put(route('tenant.raw-materials.update', $material), [
                'name' => $material->name,
                'unit' => $material->unit,
                'stock' => 99,
                'average_cost' => $material->average_cost,
                'is_active' => true,
            ])
            ->assertRedirect(route('tenant.raw-materials.index'))
            ->assertSessionHasErrors('stock');

        $this->assertSame('5.00', $material->fresh()->stock);
    }

    public function test_owner_can_open_stock_opname_dashboard_and_counting_page(): void
    {
        [$owner] = $this->inventory();
        $opname = app(StockOpnameService::class)->create($owner, ['opname_date' => today()->toDateString()]);

        $this->actingAs($owner)
            ->get(route('tenant.stock-opnames.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tenant/StockOpnames/Index')
                ->has('opnames.data', 1)
                ->where('hasActiveSession', true));

        $this->actingAs($owner)
            ->get(route('tenant.stock-opnames.show', $opname))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tenant/StockOpnames/Show')
                ->where('summary.items', 2)
                ->where('summary.uncounted', 2)
                ->where('canPost', true));
    }

    /**
     * @return array{User, Product, RawMaterial}
     */
    private function inventory(): array
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create(['tenant_id' => $tenant->id, 'role' => UserRole::Owner]);
        $category = Category::factory()->create(['tenant_id' => $tenant->id]);
        $product = Product::factory()->create([
            'tenant_id' => $tenant->id,
            'category_id' => $category->id,
            'stock' => 10,
            'cost' => 1_000,
            'track_stock' => true,
            'is_active' => true,
        ]);
        $material = RawMaterial::factory()->create([
            'tenant_id' => $tenant->id,
            'stock' => 5,
            'average_cost' => 2_000,
            'opening_cost_confirmed_at' => now(),
            'opening_cost_confirmed_by' => $owner->id,
            'is_active' => true,
        ]);

        return [$owner, $product, $material];
    }
}
