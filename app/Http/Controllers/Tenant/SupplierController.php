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
