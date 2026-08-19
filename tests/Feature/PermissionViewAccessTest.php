<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\PermissionCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PermissionViewAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_configurable_menu_has_a_view_action(): void
    {
        foreach (PermissionCatalog::menus() as $menu) {
            $this->assertSame('view', $menu['actions'][0]['key']);
            $this->assertSame('Lihat', $menu['actions'][0]['label']);
            $this->assertContains("{$menu['key']}.view", PermissionCatalog::keys());
        }
    }

    public function test_every_configurable_menu_page_is_protected_by_its_view_permission(): void
    {
        $routes = [
            'tenant.dashboard' => 'dashboard.view',
            'tenant.categories.index' => 'categories.view',
            'tenant.products.index' => 'products.view',
            'tenant.raw-materials.index' => 'raw-materials.view',
            'tenant.expenses.index' => 'expenses.view',
            'tenant.stock.products.index' => 'stock-products.view',
            'tenant.stock.raw-materials.index' => 'stock-raw-materials.view',
            'tenant.reports.transactions.index' => 'transactions.view',
            'tenant.reports.financial.index' => 'financial-reports.view',
            'tenant.reports.shifts.index' => 'shift-reports.view',
        ];

        foreach ($routes as $routeName => $permission) {
            $middleware = app('router')->getRoutes()->getByName($routeName)->gatherMiddleware();

            $this->assertContains("permission:{$permission}", $middleware);
        }
    }

    public function test_employee_needs_view_permission_to_open_a_menu_page(): void
    {
        [$employee, $role] = $this->employeeWithPermissions(['categories.create']);

        $this->actingAs($employee)
            ->get(route('tenant.categories.index'))
            ->assertForbidden();

        $role->update([
            'permissions' => ['categories.create', 'categories.view'],
        ]);

        $this->actingAs($employee->fresh())
            ->get(route('tenant.categories.index'))
            ->assertOk();
    }

    public function test_owner_can_open_a_menu_page_without_stored_permissions(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);

        $this->actingAs($owner)
            ->get(route('tenant.categories.index'))
            ->assertOk();
    }

    public function test_migration_adds_view_access_to_existing_role_menu_permissions(): void
    {
        [, $role] = $this->employeeWithPermissions([
            'categories.create',
            'products.edit',
        ]);

        $migration = require database_path('migrations/2026_08_19_000000_add_view_permissions_to_existing_roles.php');
        $migration->up();

        $this->assertEqualsCanonicalizing([
            'categories.create',
            'categories.view',
            'products.edit',
            'products.view',
        ], $role->fresh()->permissions);
    }

    /**
     * @param  array<int, string>  $permissions
     * @return array{User, Role}
     */
    private function employeeWithPermissions(array $permissions): array
    {
        $tenant = Tenant::factory()->create();
        $role = Role::create([
            'tenant_id' => $tenant->id,
            'name' => 'Kasir',
            'permissions' => $permissions,
        ]);
        $employee = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Employee,
            'employee_role_id' => $role->id,
        ]);

        return [$employee, $role];
    }
}
