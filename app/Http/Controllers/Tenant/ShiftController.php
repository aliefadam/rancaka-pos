<?php

namespace App\Http\Controllers\Tenant;

use App\Enums\PaymentMethod;
use App\Enums\TransactionStatus;
use App\Http\Controllers\Controller;
use App\Models\Shift;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            'closing_cash' => ['required', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($request, $validated) {
            $shift = Shift::where('tenant_id', $request->user()->tenant_id)
                ->whereNull('closed_at')
                ->lockForUpdate()
                ->first();

            abort_unless($shift, 404);

            $shift->transactions()
                ->where('status', TransactionStatus::Completed)
                ->where('payment_method', PaymentMethod::Cash)
                ->lockForUpdate()
                ->get();

            $shift->update([
                'closing_cash' => $validated['closing_cash'],
                'closed_at' => now(),
            ]);
        });

        return redirect()->route('tenant.pos.index')->with('success', 'Shift berhasil ditutup.');
    }
}
