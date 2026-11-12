<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TenantInterfacePreferencesTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_interface_preferences_are_shared_with_inertia(): void
    {
        $tenant = Tenant::factory()->create([
            'business_type' => 'service',
            'interface_mode' => 'simple',
            'enabled_modules' => ['expenses', 'credit'],
        ]);
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);

        $this->actingAs($owner)
            ->get(route('tenant.settings.edit'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tenant/Settings/Edit')
                ->where('tenant.business_type', 'service')
                ->where('tenant.interface_mode', 'simple')
                ->where('tenant.enabled_modules', ['expenses', 'credit'])
                ->where('tenant_ui.business_type', 'service')
                ->where('tenant_ui.mode', 'simple')
                ->where('tenant_ui.enabled_modules', ['expenses', 'credit'])
            );
    }

    public function test_owner_can_save_simple_interface_preferences(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);

        $response = $this->actingAs($owner)->put(route('tenant.settings.update'), [
            'name' => $tenant->name,
            'phone' => $tenant->phone,
            'address' => $tenant->address,
            'receipt_footer' => null,
            'receipt_size' => '58mm',
            'auto_print_receipt' => false,
            'tax_percentage' => 0,
            'service_charge_percentage' => 0,
            'business_type' => 'food_beverage',
            'interface_mode' => 'simple',
            'enabled_modules' => ['inventory', 'purchases', 'expenses', 'reports', 'reports'],
        ]);

        $response->assertRedirect(route('tenant.settings.edit'));
        $this->assertDatabaseHas('tenants', [
            'id' => $tenant->id,
            'business_type' => 'food_beverage',
            'interface_mode' => 'simple',
            'enabled_modules' => json_encode(['inventory', 'purchases', 'expenses', 'reports']),
        ]);
    }

    public function test_complete_mode_keeps_all_modules_enabled_implicitly(): void
    {
        $tenant = Tenant::factory()->create([
            'interface_mode' => 'simple',
            'enabled_modules' => ['expenses'],
        ]);
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);

        $this->actingAs($owner)->put(route('tenant.settings.update'), [
            'name' => $tenant->name,
            'phone' => $tenant->phone,
            'address' => $tenant->address,
            'receipt_footer' => null,
            'receipt_size' => '58mm',
            'auto_print_receipt' => false,
            'tax_percentage' => 0,
            'service_charge_percentage' => 0,
            'business_type' => 'retail',
            'interface_mode' => 'complete',
            'enabled_modules' => ['expenses'],
        ])->assertRedirect(route('tenant.settings.edit'));

        $tenant->refresh();

        $this->assertSame('complete', $tenant->interface_mode);
        $this->assertNull($tenant->enabled_modules);
    }

    public function test_unknown_interface_module_is_rejected(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);

        $this->actingAs($owner)
            ->from(route('tenant.settings.edit'))
            ->put(route('tenant.settings.update'), [
                'name' => $tenant->name,
                'receipt_size' => '58mm',
                'tax_percentage' => 0,
                'service_charge_percentage' => 0,
                'business_type' => 'retail',
                'interface_mode' => 'simple',
                'enabled_modules' => ['unknown'],
            ])
            ->assertRedirect(route('tenant.settings.edit'))
            ->assertSessionHasErrors('enabled_modules.0');
    }
}
