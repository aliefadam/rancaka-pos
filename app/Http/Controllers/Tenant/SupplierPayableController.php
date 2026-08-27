<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Notifications\SupplierPayableNotification;
use App\Services\SupplierPayableAgingService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SupplierPayableController extends Controller
{
    public function index(Request $request, SupplierPayableAgingService $aging): Response
    {
        $request->user()->unreadNotifications()->where('type', SupplierPayableNotification::class)->update(['read_at' => now()]);
        $tenantId = $request->user()->tenant_id;
        $today = today();
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'supplier_id' => ['nullable', 'integer', Rule::exists('suppliers', 'id')->where('tenant_id', $tenantId)],
            'due_status' => ['nullable', Rule::in(['upcoming', 'today', 'overdue', 'no_due'])],
            'due_from' => ['nullable', 'date'],
            'due_to' => ['nullable', 'date'],
        ]);
        $filters = [
            'search' => trim($filters['search'] ?? ''),
            'supplier_id' => isset($filters['supplier_id']) ? (string) $filters['supplier_id'] : '',
            'due_status' => $filters['due_status'] ?? '',
            'due_from' => $filters['due_from'] ?? '',
            'due_to' => $filters['due_to'] ?? '',
        ];

        $base = Purchase::query()->where('tenant_id', $tenantId)->where('document_status', 'posted')->where('balance_amount', '>', 0);
        $scoped = (clone $base)
            ->when($filters['search'], fn ($query, $search) => $query->where(fn ($query) => $query
                ->where('number', 'like', "%{$search}%")
                ->orWhere('supplier_invoice_number', 'like', "%{$search}%")
                ->orWhereHas('supplier', fn ($query) => $query->where('name', 'like', "%{$search}%"))))
            ->when($filters['supplier_id'], fn ($query, $supplierId) => $query->where('supplier_id', $supplierId))
            ->when($filters['due_from'], fn ($query, $date) => $query->whereDate('due_date', '>=', $date))
            ->when($filters['due_to'], fn ($query, $date) => $query->whereDate('due_date', '<=', $date));
        $payables = (clone $scoped)
            ->when($filters['due_status'] === 'upcoming', fn ($query) => $query->whereDate('due_date', '>', $today))
            ->when($filters['due_status'] === 'today', fn ($query) => $query->whereDate('due_date', $today))
            ->when($filters['due_status'] === 'overdue', fn ($query) => $query->whereDate('due_date', '<', $today))
            ->when($filters['due_status'] === 'no_due', fn ($query) => $query->whereNull('due_date'))
            ->with('supplier:id,name')->orderByRaw('due_date IS NULL')->orderBy('due_date')->paginate(15)->withQueryString();
        $payables->through(fn (Purchase $purchase) => [
            ...$purchase->toArray(),
            'is_overdue' => $purchase->isOverdue(),
        ]);

        return Inertia::render('Tenant/Payables/Index', [
            'payables' => $payables,
            'filters' => $filters,
            'suppliers' => Supplier::where('tenant_id', $tenantId)->orderBy('name')->get(['id', 'name']),
            'summary' => [
                'total' => (clone $scoped)->sum('balance_amount'),
                'upcoming' => (clone $scoped)->whereDate('due_date', '>', $today)->sum('balance_amount'),
                'today' => (clone $scoped)->whereDate('due_date', $today)->sum('balance_amount'),
                'overdue' => (clone $scoped)->whereDate('due_date', '<', $today)->sum('balance_amount'),
                'paid_this_month' => SupplierPayment::where('tenant_id', $tenantId)->where('status', 'valid')->whereBetween('payment_date', [now()->startOfMonth(), now()->endOfMonth()])->sum('amount'),
                'aging' => $aging->summarize($scoped),
            ],
        ]);
    }
}
