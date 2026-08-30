<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ApplicationBranding;
use App\Services\OptimizedUploadService;
use App\Support\UploadRules;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ApplicationBrandingController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('Admin/Branding/Edit', [
            'brandingSettings' => ApplicationBranding::query()->first(),
        ]);
    }

    public function update(Request $request, OptimizedUploadService $uploads): RedirectResponse
    {
        $request->validate([
            'light_logo' => UploadRules::image(false),
            'white_logo' => UploadRules::image(false),
            'app_logo' => UploadRules::image(false),
        ]);

        if (! $request->hasFile('light_logo')
            && ! $request->hasFile('white_logo')
            && ! $request->hasFile('app_logo')) {
            return back()->withErrors([
                'branding' => 'Pilih minimal satu logo yang ingin diperbarui.',
            ]);
        }

        $branding = ApplicationBranding::query()->firstOrCreate();
        $oldPaths = [
            'light_logo_path' => $branding->light_logo_path,
            'white_logo_path' => $branding->white_logo_path,
            'app_logo_path' => $branding->app_logo_path,
        ];
        $updates = ['updated_by' => $request->user()->id];

        if ($request->hasFile('light_logo')) {
            $updates['light_logo_path'] = $uploads->store(
                $request->file('light_logo'),
                'application-branding',
                'public',
                1200,
                1200,
                90,
            );
        }

        if ($request->hasFile('white_logo')) {
            $updates['white_logo_path'] = $uploads->store(
                $request->file('white_logo'),
                'application-branding',
                'public',
                1200,
                1200,
                90,
            );
        }

        if ($request->hasFile('app_logo')) {
            $updates['app_logo_path'] = $uploads->store(
                $request->file('app_logo'),
                'application-branding',
                'public',
                1024,
                1024,
                90,
            );
        }

        $branding->update($updates);

        foreach (['light_logo_path', 'white_logo_path', 'app_logo_path'] as $attribute) {
            if (isset($updates[$attribute]) && $oldPaths[$attribute]) {
                Storage::disk('public')->delete($oldPaths[$attribute]);
            }
        }

        return back()->with('success', 'Logo aplikasi Rancaka berhasil diperbarui.');
    }
}
