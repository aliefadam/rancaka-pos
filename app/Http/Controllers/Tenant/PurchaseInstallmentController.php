<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Services\PurchaseInstallmentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PurchaseInstallmentController extends Controller
{
    public function update(Request $request, Purchase $purchase, PurchaseInstallmentService $service): RedirectResponse
    {
        abort_unless($purchase->tenant_id === $request->user()->tenant_id, 403);

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
            'installments' => ['required', 'array', 'min:1', 'max:60'],
            'installments.*.id' => ['nullable', 'integer'],
            'installments.*.due_date' => ['required', 'date', 'after_or_equal:'.$purchase->purchase_date->toDateString()],
            'installments.*.planned_amount' => ['required', 'integer', 'min:1'],
        ]);

        $service->revise($request->user(), $purchase, $data['installments'], $data['reason']);

        return back()->with('success', 'Jadwal termin berhasil diperbarui dan dicatat pada histori audit.');
    }
}
