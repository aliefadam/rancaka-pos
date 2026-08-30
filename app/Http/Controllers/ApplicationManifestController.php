<?php

namespace App\Http\Controllers;

use App\Models\ApplicationBranding;
use Illuminate\Http\JsonResponse;

class ApplicationManifestController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $branding = ApplicationBranding::query()->first();
        $icon = $branding?->app_logo_url ?? asset('pwa/icon-512.png');

        return response()->json([
            'name' => 'Rancaka Point of Sale',
            'short_name' => 'Rancaka POS',
            'description' => 'Kelola transaksi dan operasional toko melalui Rancaka POS.',
            'lang' => 'id-ID',
            'start_url' => '/tenant/pos',
            'scope' => '/',
            'display' => 'standalone',
            'background_color' => '#080e1a',
            'theme_color' => '#4f46e5',
            'icons' => [[
                'src' => $icon,
                'sizes' => 'any',
                'type' => $branding?->app_logo_path ? 'image/webp' : 'image/png',
                'purpose' => 'any maskable',
            ]],
        ], 200, [
            'Content-Type' => 'application/manifest+json',
            'Cache-Control' => 'no-cache, private',
        ]);
    }
}
