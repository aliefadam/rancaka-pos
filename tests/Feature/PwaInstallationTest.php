<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PwaInstallationTest extends TestCase
{
    use RefreshDatabase;

    public function test_pwa_assets_are_ready_for_browser_installation(): void
    {
        $manifestPath = public_path('manifest.webmanifest');
        $manifest = json_decode(file_get_contents($manifestPath), true, flags: JSON_THROW_ON_ERROR);

        $this->assertSame('Rancaka Point of Sale', $manifest['name']);
        $this->assertSame('/tenant/pos', $manifest['start_url']);
        $this->assertSame('standalone', $manifest['display']);
        $this->assertFileExists(public_path('sw.js'));
        $this->assertFileExists(public_path('offline.html'));

        foreach ([192, 512] as $size) {
            $iconPath = public_path("pwa/icon-{$size}.png");
            $this->assertFileExists($iconPath);
            [$width, $height] = getimagesize($iconPath);
            $this->assertSame($size, $width);
            $this->assertSame($size, $height);
        }
    }

    public function test_authenticated_tenant_can_download_rancaka_print_apk(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);

        $this->actingAs($owner)
            ->get(route('tenant.printer.download'))
            ->assertOk()
            ->assertDownload('printer-rancaka.apk');
    }
}
