<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantImpersonationTest extends TestCase
{
    use RefreshDatabase;

    public function test_superadmin_can_impersonate_tenant_owner_and_return_to_admin(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Superadmin]);
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);

        $this->actingAs($admin)
            ->post(route('admin.tenants.impersonate', $tenant))
            ->assertRedirect(route('tenant.dashboard'))
            ->assertSessionHas('impersonation.original_user_id', $admin->id);

        $this->assertAuthenticatedAs($owner);

        $this->post(route('impersonation.stop'))
            ->assertRedirect(route('admin.tenants.index'))
            ->assertSessionMissing('impersonation.original_user_id');

        $this->assertAuthenticatedAs($admin);
    }

    public function test_non_superadmin_cannot_start_impersonation(): void
    {
        $sourceTenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $sourceTenant->id,
            'role' => UserRole::Owner,
        ]);
        $targetTenant = Tenant::factory()->create();
        User::factory()->create([
            'tenant_id' => $targetTenant->id,
            'role' => UserRole::Owner,
        ]);

        $this->actingAs($owner)
            ->post(route('admin.tenants.impersonate', $targetTenant))
            ->assertForbidden();

        $this->assertAuthenticatedAs($owner);
    }

    public function test_impersonation_requires_tenant_owner(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Superadmin]);
        $tenant = Tenant::factory()->create();

        $this->actingAs($admin)
            ->post(route('admin.tenants.impersonate', $tenant))
            ->assertSessionHasErrors('impersonation');

        $this->assertAuthenticatedAs($admin);
    }

    public function test_regular_user_cannot_stop_impersonation_without_session(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);

        $this->actingAs($owner)
            ->post(route('impersonation.stop'))
            ->assertForbidden();
    }
}
