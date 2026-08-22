<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\SupplierPayment;
use App\Notifications\SupplierPayableNotification;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupplierPayableController extends Controller
{
    public function index(Request $request): Response
    {
        $request->user()->unreadNotifications()->where('type', SupplierPayableNotification::class)->update(['read_at' => now()]);
        $tenantId = $request->user()->tenant_id;
        $today = today();
        $base = Purchase::query()->where('tenant_id', $tenantId)->where('document_status', 'posted')->where('balance_amount', '>', 0);
        $payables = (clone $base)->with('supplier:id,name')->orderByRaw('due_date IS NULL')->orderBy('due_date')->paginate(15);

        return Inertia::render('Tenant/Payables/Index', [
            'payables' => $payables,
            'summary' => [
                'total' => (clone $base)->sum('balance_amount'),
                'upcoming' => (clone $base)->where('due_date', '>', $today)->sum('balance_amount'),
                'today' => (clone $base)->whereDate('due_date', $today)->sum('balance_amount'),
                'overdue' => (clone $base)->where('due_date', '<', $today)->sum('balance_amount'),
                'paid_this_month' => SupplierPayment::where('tenant_id', $tenantId)->where('status', 'valid')->whereBetween('payment_date', [now()->startOfMonth(), now()->endOfMonth()])->sum('amount'),
            ],
        ]);
    }
}
