<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\ApplicationBranding;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ApplicationBrandingTest extends TestCase
{
    use RefreshDatabase;

    public function test_superadmin_can_open_application_branding_page(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::Superadmin,
            'tenant_id' => null,
        ]);

        $this->actingAs($admin)
            ->get(route('admin.branding.edit'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Branding/Edit')
                ->where('branding.light_logo_url', asset('logo.png'))
                ->where('branding.white_logo_url', asset('logo.png'))
                ->where('branding.app_logo_url', asset('pwa/icon-512.png'))
                ->where('brandingSettings', null)
            );
    }

    public function test_superadmin_can_upload_light_dark_and_application_logos(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create([
            'role' => UserRole::Superadmin,
            'tenant_id' => null,
        ]);

        $response = $this->actingAs($admin)->post(route('admin.branding.update'), [
            '_method' => 'put',
            'light_logo' => UploadedFile::fake()->image('rancaka-light.png', 800, 240),
            'white_logo' => UploadedFile::fake()->image('rancaka-white.png', 800, 240),
            'app_logo' => UploadedFile::fake()->image('app-logo.png', 512, 512),
        ]);

        $response->assertRedirect()->assertSessionHasNoErrors();

        $branding = ApplicationBranding::query()->firstOrFail();
        $this->assertSame($admin->id, $branding->updated_by);
        $this->assertStringEndsWith('.webp', $branding->light_logo_path);
        $this->assertStringEndsWith('.webp', $branding->white_logo_path);
        $this->assertStringEndsWith('.webp', $branding->app_logo_path);
        Storage::disk('public')->assertExists($branding->light_logo_path);
        Storage::disk('public')->assertExists($branding->white_logo_path);
        Storage::disk('public')->assertExists($branding->app_logo_path);
    }

    public function test_tenant_owner_cannot_manage_application_branding(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'role' => UserRole::Owner,
            'tenant_id' => $tenant->id,
        ]);

        $this->actingAs($owner)
            ->get(route('admin.branding.edit'))
            ->assertForbidden();

        $this->actingAs($owner)
            ->put(route('admin.branding.update'))
            ->assertForbidden();
    }

    public function test_manifest_uses_uploaded_application_logo(): void
    {
        $branding = ApplicationBranding::query()->create([
            'app_logo_path' => 'application-branding/app-logo.webp',
        ]);

        $this->get(route('app.manifest'))
            ->assertOk()
            ->assertHeader('Content-Type', 'application/manifest+json')
            ->assertJsonPath('icons.0.src', $branding->app_logo_url)
            ->assertJsonPath('icons.0.type', 'image/webp');
    }
}
