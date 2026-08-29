<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\RawMaterial;
use App\Models\Supplier;
use App\Services\OptimizedUploadService;
use App\Services\PurchaseService;
use App\Support\UploadRules;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseController extends Controller
{
    public function index(Request $request): Response
    {
        $tenantId = $request->user()->tenant_id;
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'supplier_id' => ['nullable', 'integer', Rule::exists('suppliers', 'id')->where('tenant_id', $tenantId)],
            'payment_status' => ['nullable', Rule::in(['paid', 'unpaid', 'partial', 'overdue', 'void'])],
            'purchase_from' => ['nullable', 'date'],
            'purchase_to' => ['nullable', 'date'],
            'due_from' => ['nullable', 'date'],
            'due_to' => ['nullable', 'date'],
        ]);
        $filters = [
            'search' => trim($filters['search'] ?? ''),
            'supplier_id' => isset($filters['supplier_id']) ? (string) $filters['supplier_id'] : '',
            'payment_status' => $filters['payment_status'] ?? '',
            'purchase_from' => $filters['purchase_from'] ?? '',
            'purchase_to' => $filters['purchase_to'] ?? '',
            'due_from' => $filters['due_from'] ?? '',
            'due_to' => $filters['due_to'] ?? '',
        ];

        $purchases = Purchase::query()->where('tenant_id', $tenantId)->with('supplier:id,name')
            ->when($filters['search'], fn ($query, $search) => $query->where(fn ($query) => $query
                ->where('number', 'like', "%{$search}%")
                ->orWhere('supplier_invoice_number', 'like', "%{$search}%")
                ->orWhereHas('supplier', fn ($query) => $query->where('name', 'like', "%{$search}%"))))
            ->when($filters['supplier_id'], fn ($query, $supplierId) => $query->where('supplier_id', $supplierId))
            ->when($filters['payment_status'], fn ($query, $status) => $query->where('payment_status', $status))
            ->when($filters['purchase_from'], fn ($query, $date) => $query->whereDate('purchase_date', '>=', $date))
            ->when($filters['purchase_to'], fn ($query, $date) => $query->whereDate('purchase_date', '<=', $date))
            ->when($filters['due_from'], fn ($query, $date) => $query->whereDate('due_date', '>=', $date))
            ->when($filters['due_to'], fn ($query, $date) => $query->whereDate('due_date', '<=', $date))
            ->latest('purchase_date')->latest('id')->paginate(15)->withQueryString();

        return Inertia::render('Tenant/Purchases/Index', [
            'purchases' => $purchases,
            'filters' => $filters,
            'suppliers' => Supplier::where('tenant_id', $tenantId)->orderBy('name')->get(['id', 'name']),
            'summary' => ['month_total' => Purchase::where('tenant_id', $tenantId)->where('document_status', 'posted')->whereBetween('purchase_date', [now()->startOfMonth(), now()->endOfMonth()])->sum('total_amount'), 'payable' => Purchase::where('tenant_id', $tenantId)->where('document_status', 'posted')->sum('balance_amount')],
            'openingCostCount' => $request->user()->isOwner()
                ? RawMaterial::where('tenant_id', $tenantId)->where('stock', '>', 0)->whereNull('opening_cost_confirmed_at')->count()
                : 0,
        ]);
    }

    public function create(Request $request): Response
    {
        $tenantId = $request->user()->tenant_id;
        $openingCostCount = RawMaterial::where('tenant_id', $tenantId)
            ->where('stock', '>', 0)
            ->whereNull('opening_cost_confirmed_at')
            ->count();

        return Inertia::render('Tenant/Purchases/Create', [
            'suppliers' => Supplier::where('tenant_id', $tenantId)->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'products' => Product::where('tenant_id', $tenantId)->where('is_active', true)->where('track_stock', true)->orderBy('name')->get(['id', 'name', 'stock', 'cost']),
            'rawMaterials' => RawMaterial::where('tenant_id', $tenantId)->where('is_active', true)->orderBy('name')->get(['id', 'name', 'unit', 'stock', 'average_cost', 'opening_cost_confirmed_at']),
            'openingCostCount' => $openingCostCount,
            'canSetOpeningCosts' => $request->user()->isOwner(),
        ]);
    }

    public function store(Request $request, PurchaseService $service, OptimizedUploadService $uploads): RedirectResponse
    {
        $data = $request->validate([
            'supplier_id' => ['required', 'integer'], 'purchase_date' => ['required', 'date', 'before_or_equal:today'],
            'supplier_invoice_number' => ['nullable', 'string', 'max:255'], 'payment_term' => ['required', Rule::in(['paid', 'credit', 'installment'])],
            'due_date' => ['nullable', 'required_unless:payment_term,paid', 'date', 'after_or_equal:purchase_date'],
            'items' => ['required', 'array', 'min:1'], 'items.*.item_type' => ['required', Rule::in(['product', 'raw_material'])],
            'items.*.item_id' => ['required', 'integer'], 'items.*.quantity' => ['required', 'numeric', 'gt:0', 'max:999999999'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0', 'max:999999999999'],
            'discount_amount' => ['nullable', 'integer', 'min:0'], 'additional_cost_amount' => ['nullable', 'integer', 'min:0'],
            'additional_cost_note' => ['nullable', 'string', 'max:255'], 'note' => ['nullable', 'string', 'max:2000'],
            'initial_payment_amount' => ['nullable', 'integer', 'min:0'],
            'initial_payment_method' => ['nullable', 'required_if:payment_term,paid,installment', Rule::in(['cash', 'transfer', 'qris', 'other'])],
            'initial_reference_number' => ['nullable', 'string', 'max:255'], 'installments' => ['nullable', 'array'],
            'installments.*.due_date' => ['required', 'date', 'after_or_equal:purchase_date'], 'installments.*.amount' => ['required', 'integer', 'min:1'],
            'supplier_invoice' => UploadRules::proof(false), 'initial_payment_proof' => UploadRules::proof(false),
        ]);
        if (in_array($data['initial_payment_method'] ?? null, ['transfer', 'qris', 'other'], true) && ! $request->hasFile('initial_payment_proof')) {
            return back()->withErrors(['initial_payment_proof' => 'Bukti wajib untuk pembayaran non-tunai.'])->withInput();
        }
        $invoice = $request->hasFile('supplier_invoice') ? $uploads->store($request->file('supplier_invoice'), "purchases/{$request->user()->tenant_id}/invoices", 'local') : null;
        $proof = $request->hasFile('initial_payment_proof') ? $uploads->store($request->file('initial_payment_proof'), "purchases/{$request->user()->tenant_id}/payments", 'local') : null;
        try {
            $purchase = $service->create($request->user(), $data, $invoice, $proof);
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete(array_filter([$invoice, $proof]));
            throw $exception;
        }

        return redirect()->route('tenant.purchases.show', $purchase)->with('success', 'Pembelian berhasil diposting dan stok telah diperbarui.');
    }

    public function show(Request $request, Purchase $purchase): Response
    {
        $this->authorizeTenant($request, $purchase);
        $purchase->load([
            'supplier',
            'items',
            'installments',
            'payments' => fn ($query) => $query->with(['creator', 'voider'])->latest('payment_date')->latest('id'),
            'installmentScheduleHistories.actor:id,name',
            'creator',
        ]);

        return Inertia::render('Tenant/Purchases/Show', ['purchase' => $purchase]);
    }

    public function void(Request $request, Purchase $purchase, PurchaseService $service): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:1000'], 'password' => ['required', 'current_password']]);
        $service->void($request->user(), $purchase, $data['reason']);

        return back()->with('success', 'Pembelian berhasil dibatalkan dan stok dipulihkan.');
    }

    public function invoice(Request $request, Purchase $purchase)
    {
        $this->authorizeTenant($request, $purchase);
        abort_unless($purchase->supplier_invoice_path, 404);

        return Storage::disk('local')->response($purchase->supplier_invoice_path);
    }

    private function authorizeTenant(Request $request, Purchase $purchase): void
    {
        abort_unless($purchase->tenant_id === $request->user()->tenant_id, 403);
    }
}
