<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Services\OptimizedUploadService;
use App\Support\UploadRules;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('Tenant/Settings/Edit', [
            'tenant' => $request->user()->tenant,
        ]);
    }

    public function update(Request $request, OptimizedUploadService $uploads): RedirectResponse
    {
        $tenant = $request->user()->tenant;

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:500'],
            'logo' => UploadRules::image(false),
            'receipt_footer' => ['nullable', 'string', 'max:255'],
            'receipt_size' => ['required', 'in:58mm,80mm'],
            'auto_print_receipt' => ['nullable', 'boolean'],
            'tax_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'service_charge_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        if ($request->hasFile('logo')) {
            if ($tenant->logo_path) {
                Storage::disk('public')->delete($tenant->logo_path);
            }

            $validated['logo_path'] = $uploads->store($request->file('logo'), 'tenant-logos', 'public', 1200, 1200, 82);
        }

        unset($validated['logo']);
        $validated['auto_print_receipt'] = (bool) ($validated['auto_print_receipt'] ?? false);

        $tenant->update($validated);

        return redirect()->route('tenant.settings.edit')->with('success', 'Pengaturan toko berhasil disimpan.');
    }
}
