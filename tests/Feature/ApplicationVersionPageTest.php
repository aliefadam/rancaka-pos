<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ApplicationVersionPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_superadmin_can_open_the_application_version_page(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::Superadmin,
            'tenant_id' => null,
        ]);

        $this->actingAs($admin)
            ->get(route('admin.version.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Version/Index')
                ->where('app.name', config('app.name'))
                ->where('app.version', config('app.version'))
            );
    }

    public function test_tenant_owner_can_open_the_application_version_page(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'role' => UserRole::Owner,
            'tenant_id' => $tenant->id,
        ]);

        $this->actingAs($owner)
            ->get(route('tenant.version.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Version/Index')
                ->where('app.version', config('app.version'))
            );
    }

    public function test_tenant_cannot_open_the_admin_version_page(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'role' => UserRole::Owner,
            'tenant_id' => $tenant->id,
        ]);

        $this->actingAs($owner)
            ->get(route('admin.version.index'))
            ->assertForbidden();
    }

    public function test_tenant_employee_can_open_the_application_version_page(): void
    {
        $tenant = Tenant::factory()->create();
        $employee = User::factory()->create([
            'role' => UserRole::Employee,
            'tenant_id' => $tenant->id,
        ]);

        $this->actingAs($employee)
            ->get(route('tenant.version.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Version/Index')
                ->where('app.version', config('app.version'))
            );
    }
}
