<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    public function index(Request $request): Response
    {
        $tenantId = $request->user()->tenant_id;
        $search = $request->string('search')->trim()->toString();
        $suppliers = Supplier::query()->where('tenant_id', $tenantId)
            ->when($search, fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->withSum(['purchases as payable_total' => fn ($query) => $query->where('document_status', 'posted')], 'balance_amount')
            ->orderBy('name')->paginate(15)->withQueryString();

        return Inertia::render('Tenant/Suppliers/Index', ['suppliers' => $suppliers, 'filters' => ['search' => $search]]);
    }

    public function store(Request $request): RedirectResponse
    {
        Supplier::create(['tenant_id' => $request->user()->tenant_id, ...$this->validated($request)]);

        return back()->with('success', 'Supplier berhasil ditambahkan.');
    }

    public function show(Request $request, Supplier $supplier): Response
    {
        abort_unless($supplier->tenant_id === $request->user()->tenant_id, 403);

        $purchases = $supplier->purchases()
            ->with('creator:id,name')
            ->latest('purchase_date')->latest('id')
            ->paginate(10, ['*'], 'purchases_page')
            ->withQueryString();
        $payments = $supplier->payments()
            ->with(['purchase:id,number', 'creator:id,name'])
            ->latest('payment_date')->latest('id')
            ->paginate(10, ['*'], 'payments_page')
            ->withQueryString();

        $postedPurchases = $supplier->purchases()->where('document_status', 'posted');

        return Inertia::render('Tenant/Suppliers/Show', [
            'supplier' => $supplier,
            'purchases' => $purchases,
            'payments' => $payments,
            'summary' => [
                'purchase_count' => (clone $postedPurchases)->count(),
                'purchase_total' => (clone $postedPurchases)->sum('total_amount'),
                'payable_total' => (clone $postedPurchases)->sum('balance_amount'),
                'paid_total' => $supplier->payments()->where('status', 'valid')->sum('amount'),
            ],
        ]);
    }

    public function update(Request $request, Supplier $supplier): RedirectResponse
    {
        abort_unless($supplier->tenant_id === $request->user()->tenant_id, 403);
        $supplier->update($this->validated($request, $supplier));

        return back()->with('success', 'Supplier berhasil diperbarui.');
    }

    private function validated(Request $request, ?Supplier $supplier = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('suppliers')->where('tenant_id', $request->user()->tenant_id)->ignore($supplier)],
            'phone' => ['nullable', 'string', 'max:30'], 'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'], 'contact_name' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:1000'], 'is_active' => ['required', 'boolean'],
        ]);
    }
}
