<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use RuntimeException;
use Tests\TestCase;

class ErrorPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_sees_branded_not_found_page_with_home_action(): void
    {
        $this->get('/halaman-yang-tidak-tersedia')
            ->assertNotFound()
            ->assertSee('Rancaka')
            ->assertSee('Halaman tidak ditemukan')
            ->assertSee('Ke Beranda')
            ->assertSee('Kembali');
    }

    public function test_authenticated_user_sees_dashboard_action_on_forbidden_page(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);

        $this->actingAs($owner)
            ->get(route('admin.dashboard'))
            ->assertForbidden()
            ->assertSee('Akses ke halaman ini dibatasi')
            ->assertSee('Ke Dashboard')
            ->assertSee('href="'.route('home').'"', false);
    }

    public function test_server_error_uses_safe_branded_fallback_without_exposing_exception(): void
    {
        config()->set('app.debug', false);
        Route::get('/testing/server-error', fn () => throw new RuntimeException('Rahasia internal tidak boleh tampil'));

        $this->get('/testing/server-error')
            ->assertStatus(500)
            ->assertSee('Ada kendala di sistem')
            ->assertSee('Data tetap aman')
            ->assertDontSee('Rahasia internal tidak boleh tampil');
    }

    public function test_expired_session_page_has_recovery_actions(): void
    {
        Route::get('/testing/expired-session', fn () => abort(419));

        $this->get('/testing/expired-session')
            ->assertStatus(419)
            ->assertSee('Sesi Anda sudah berakhir')
            ->assertSee('Ke Beranda')
            ->assertSee('Kembali');
    }
}
