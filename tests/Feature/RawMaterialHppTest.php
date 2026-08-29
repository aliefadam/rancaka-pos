<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\RawMaterial;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RawMaterialHppTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_raw_material_with_opening_stock_and_hpp(): void
    {
        [$tenant, $owner] = $this->owner();

        $this->actingAs($owner)
            ->post(route('tenant.raw-materials.store'), [
                'name' => 'Tali kur',
                'unit' => 'meter',
                'stock' => 25,
                'average_cost' => 1_500,
                'is_active' => true,
            ])
            ->assertRedirect(route('tenant.raw-materials.index'))
            ->assertSessionHasNoErrors();

        $material = RawMaterial::where('tenant_id', $tenant->id)->firstOrFail();

        $this->assertSame('1500.0000', $material->average_cost);
        $this->assertNotNull($material->opening_cost_confirmed_at);
        $this->assertSame($owner->id, $material->opening_cost_confirmed_by);
    }

    public function test_hpp_is_required_when_raw_material_has_opening_stock(): void
    {
        [, $owner] = $this->owner();

        $this->actingAs($owner)
            ->from(route('tenant.raw-materials.index'))
            ->post(route('tenant.raw-materials.store'), [
                'name' => 'Kain kanvas',
                'unit' => 'meter',
                'stock' => 10,
                'average_cost' => '',
                'is_active' => true,
            ])
            ->assertRedirect(route('tenant.raw-materials.index'))
            ->assertSessionHasErrors('average_cost');

        $this->assertDatabaseMissing('raw_materials', ['name' => 'Kain kanvas']);
    }

    public function test_owner_can_set_missing_opening_hpp_from_raw_material_form(): void
    {
        [$tenant, $owner] = $this->owner();
        $material = RawMaterial::factory()->create([
            'tenant_id' => $tenant->id,
            'stock' => 12,
            'average_cost' => 0,
            'opening_cost_confirmed_at' => null,
            'opening_cost_confirmed_by' => null,
        ]);

        $this->actingAs($owner)
            ->put(route('tenant.raw-materials.update', $material), [
                'name' => $material->name,
                'unit' => $material->unit,
                'stock' => $material->stock,
                'average_cost' => 2_750,
                'is_active' => true,
            ])
            ->assertRedirect(route('tenant.raw-materials.index'))
            ->assertSessionHasNoErrors();

        $material->refresh();

        $this->assertSame('2750.0000', $material->average_cost);
        $this->assertNotNull($material->opening_cost_confirmed_at);
        $this->assertSame($owner->id, $material->opening_cost_confirmed_by);
    }

    public function test_confirmed_moving_average_hpp_cannot_be_overwritten_from_master_data(): void
    {
        [$tenant, $owner] = $this->owner();
        $material = RawMaterial::factory()->create([
            'tenant_id' => $tenant->id,
            'stock' => 12,
            'average_cost' => 2_750,
            'opening_cost_confirmed_at' => now(),
            'opening_cost_confirmed_by' => $owner->id,
        ]);

        $this->actingAs($owner)
            ->put(route('tenant.raw-materials.update', $material), [
                'name' => $material->name,
                'unit' => $material->unit,
                'stock' => $material->stock,
                'average_cost' => 99_999,
                'is_active' => true,
            ])
            ->assertRedirect(route('tenant.raw-materials.index'))
            ->assertSessionHasNoErrors();

        $this->assertSame('2750.0000', $material->fresh()->average_cost);
    }

    public function test_purchase_form_warns_owner_about_materials_with_missing_opening_hpp(): void
    {
        [$tenant, $owner] = $this->owner();
        RawMaterial::factory()->create([
            'tenant_id' => $tenant->id,
            'stock' => 12,
            'average_cost' => 0,
            'opening_cost_confirmed_at' => null,
        ]);

        $this->actingAs($owner)
            ->get(route('tenant.purchases.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tenant/Purchases/Create')
                ->where('openingCostCount', 1)
                ->where('canSetOpeningCosts', true));
    }

    /**
     * @return array{Tenant, User}
     */
    private function owner(): array
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);

        return [$tenant, $owner];
    }
}
