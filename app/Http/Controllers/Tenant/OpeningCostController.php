<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\RawMaterial;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OpeningCostController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Tenant/Purchases/OpeningCosts', ['materials' => RawMaterial::where('tenant_id', $request->user()->tenant_id)->where('stock', '>', 0)->whereNull('opening_cost_confirmed_at')->orderBy('name')->get(['id', 'name', 'unit', 'stock'])]);
    }

    public function update(Request $request, RawMaterial $rawMaterial): RedirectResponse
    {
        abort_unless($request->user()->isOwner() && $rawMaterial->tenant_id === $request->user()->tenant_id, 403);
        $data = $request->validate(['average_cost' => ['required', 'numeric', 'min:0', 'max:999999999999']]);
        $rawMaterial->update(['average_cost' => $data['average_cost'], 'opening_cost_confirmed_at' => now(), 'opening_cost_confirmed_by' => $request->user()->id]);

        return back()->with('success', 'Saldo awal HPP berhasil ditetapkan.');
    }
}
