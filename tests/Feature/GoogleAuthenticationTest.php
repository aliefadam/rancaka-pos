<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Tests\TestCase;

class GoogleAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_google_user_gets_default_username_and_must_create_store(): void
    {
        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-123',
            'name' => 'Budi Santoso',
            'email' => 'budi.santoso@example.com',
            'avatar' => 'https://example.com/avatar.jpg',
        ]));

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('onboarding.store.create'));

        $this->assertAuthenticated();
        $user = User::firstOrFail();
        $this->assertSame('budi.santoso', $user->username);
        $this->assertNull($user->tenant_id);

        $this->get(route('tenant.pos.index'))
            ->assertRedirect(route('onboarding.store.create'));

        $this->post(route('onboarding.store.store'), [
            'store_name' => 'Kedai Google',
            'phone' => '081234567890',
            'address' => 'Bandung',
            'username' => 'budi.owner',
        ])->assertRedirect(route('tenant.dashboard'));

        $this->assertDatabaseHas('tenants', ['name' => 'Kedai Google', 'email' => 'budi.santoso@example.com']);
        $this->assertDatabaseHas('users', ['id' => $user->id, 'username' => 'budi.owner']);
        $this->assertDatabaseHas('subscriptions', ['status' => 'trialing', 'is_grandfathered' => false]);
        $this->assertDatabaseHas('billing_invoices', ['status' => 'open']);
    }

    public function test_username_can_be_changed_from_account_settings(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => $tenant->id, 'username' => 'username.lama']);

        $this->actingAs($user)->put(route('account.update'), [
            'name' => $user->name,
            'username' => 'username.baru',
        ])->assertSessionHasNoErrors();

        $this->assertSame('username.baru', $user->fresh()->username);
    }

    public function test_google_login_links_legacy_owner_through_tenant_email(): void
    {
        $tenant = Tenant::factory()->create(['email' => 'owner@example.com']);
        $owner = User::factory()->create(['tenant_id' => $tenant->id, 'role' => UserRole::Owner, 'email' => null]);
        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-legacy',
            'name' => $owner->name,
            'email' => 'owner@example.com',
        ]));

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('tenant.dashboard'));

        $this->assertAuthenticatedAs($owner);
        $this->assertDatabaseHas('users', [
            'id' => $owner->id,
            'email' => 'owner@example.com',
            'google_id' => 'google-legacy',
        ]);
    }
}
