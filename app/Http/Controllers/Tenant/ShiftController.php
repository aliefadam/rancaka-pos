<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ShiftController extends Controller
{
    public function open(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'opening_cash' => ['required', 'integer', 'min:0'],
        ]);

        $tenantId = $request->user()->tenant_id;

        if (Shift::where('tenant_id', $tenantId)->whereNull('closed_at')->exists()) {
            return redirect()->route('tenant.pos.index')->with('error', 'Shift sudah dibuka.');
        }

        Shift::create([
            'tenant_id' => $tenantId,
            'user_id' => $request->user()->id,
            'opening_cash' => $validated['opening_cash'],
            'opened_at' => now(),
        ]);

        return redirect()->route('tenant.pos.index')->with('success', 'Shift berhasil dibuka.');
    }

    public function close(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'closing_cash' => ['nullable', 'integer', 'min:0'],
        ]);

        $shift = Shift::where('tenant_id', $request->user()->tenant_id)
            ->whereNull('closed_at')
            ->first();

        abort_unless($shift, 404);

        $shift->update([
            'closing_cash' => $validated['closing_cash'] ?? null,
            'closed_at' => now(),
        ]);

        return redirect()->route('tenant.pos.index')->with('success', 'Shift berhasil ditutup.');
    }
}
