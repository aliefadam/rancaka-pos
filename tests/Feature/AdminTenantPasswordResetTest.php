<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminTenantPasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_superadmin_can_reset_tenant_owner_password_to_default(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Superadmin]);
        $tenant = Tenant::factory()->create(['name' => 'Kedai Utama']);
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
            'password' => 'password-lama',
        ]);
        $employee = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Employee,
            'password' => 'password-karyawan',
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.tenants.reset-password', $tenant))
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertTrue(Hash::check('123123123', $owner->fresh()->password));
        $this->assertTrue(Hash::check('password-karyawan', $employee->fresh()->password));
    }

    public function test_tenant_owner_cannot_reset_another_tenant_password(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);

        $this->actingAs($owner)
            ->patch(route('admin.tenants.reset-password', $tenant))
            ->assertForbidden();
    }

    public function test_reset_password_fails_gracefully_when_tenant_has_no_owner(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Superadmin]);
        $tenant = Tenant::factory()->create();

        $this->actingAs($admin)
            ->from(route('admin.tenants.index'))
            ->patch(route('admin.tenants.reset-password', $tenant))
            ->assertRedirect(route('admin.tenants.index'))
            ->assertSessionHas('error');
    }
}
