<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Database\Seeders\SuperadminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SuperadminSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_configured_administrator_account(): void
    {
        config()->set('superadmin.username', 'administrator');
        config()->set('superadmin.password', 'X7!qP9@vL2#rT8$kM4&zN6*w');
        config()->set('superadmin.email', 'administrator@example.com');

        $this->seed(SuperadminSeeder::class);

        $admin = User::query()->where('username', 'administrator')->firstOrFail();
        $this->assertSame(UserRole::Superadmin, $admin->role);
        $this->assertNull($admin->tenant_id);
        $this->assertSame('administrator@example.com', $admin->email);
        $this->assertTrue(Hash::check('X7!qP9@vL2#rT8$kM4&zN6*w', $admin->password));
    }

    public function test_it_migrates_legacy_admin_and_rotates_weak_password(): void
    {
        $legacy = User::factory()->create([
            'username' => 'admin',
            'password' => 'admin123',
            'role' => UserRole::Superadmin,
            'tenant_id' => null,
        ]);
        config()->set('superadmin.username', 'administrator');
        config()->set('superadmin.password', null);

        $this->seed(SuperadminSeeder::class);

        $admin = $legacy->fresh();
        $this->assertSame('administrator', $admin->username);
        $this->assertFalse(Hash::check('admin123', $admin->password));
        $this->assertDatabaseMissing('users', ['username' => 'admin']);
    }
}
