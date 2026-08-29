<?php

namespace App\Http\Controllers\Tenant;

use App\Enums\StockOpnameStatus;
use App\Http\Controllers\Controller;
use App\Models\StockOpname;
use App\Services\StockOpnameService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class StockOpnameController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::enum(StockOpnameStatus::class)],
        ]);

        $opnames = StockOpname::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->with('creator:id,name')
            ->withCount('items')
            ->withCount(['items as counted_items_count' => fn ($query) => $query->whereNotNull('physical_stock')])
            ->withCount(['items as variance_items_count' => fn ($query) => $query->where('variance_quantity', '!=', 0)])
            ->withSum('items as variance_value_total', 'variance_value')
            ->when($filters['search'] ?? null, fn ($query, $search) => $query->where('number', 'like', "%{$search}%"))
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->latest('opname_date')
            ->latest('id')
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('Tenant/StockOpnames/Index', [
            'opnames' => $opnames,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'status' => $filters['status'] ?? '',
            ],
            'hasActiveSession' => StockOpname::query()
                ->where('tenant_id', $request->user()->tenant_id)
                ->whereIn('status', [
                    StockOpnameStatus::Draft,
                    StockOpnameStatus::Counting,
                    StockOpnameStatus::Submitted,
                ])->exists(),
        ]);
    }

    public function store(Request $request, StockOpnameService $service): RedirectResponse
    {
        $data = $request->validate([
            'opname_date' => ['required', 'date', 'before_or_equal:today'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);
        $opname = $service->create($request->user(), $data);

        return redirect()->route('tenant.stock-opnames.show', $opname)
            ->with('success', 'Sesi stock opname dan snapshot stok berhasil dibuat.');
    }

    public function show(Request $request, StockOpname $stockOpname): Response
    {
        $this->authorizeTenant($request, $stockOpname);
        $stockOpname->load([
            'creator:id,name',
            'starter:id,name',
            'submitter:id,name',
            'poster:id,name',
            'canceller:id,name',
            'items' => fn ($query) => $query->with('counter:id,name')->orderBy('item_type')->orderBy('item_name'),
        ]);

        $items = $stockOpname->items;
        $counted = $items->whereNotNull('physical_stock');
        $positiveValue = $counted->where('variance_value', '>', 0)->sum('variance_value');
        $negativeValue = abs($counted->where('variance_value', '<', 0)->sum('variance_value'));

        return Inertia::render('Tenant/StockOpnames/Show', [
            'opname' => $stockOpname,
            'summary' => [
                'items' => $items->count(),
                'counted' => $counted->count(),
                'uncounted' => $items->count() - $counted->count(),
                'matched' => $counted->where('variance_quantity', 0)->count(),
                'variance_items' => $counted->where('variance_quantity', '!=', 0)->count(),
                'positive_value' => $positiveValue,
                'negative_value' => $negativeValue,
                'net_value' => $positiveValue - $negativeValue,
            ],
            'canPost' => $request->user()->isOwner(),
        ]);
    }

    public function start(Request $request, StockOpname $stockOpname, StockOpnameService $service): RedirectResponse
    {
        $service->start($request->user(), $stockOpname);

        return back()->with('success', 'Penghitungan stock opname dimulai.');
    }

    public function saveCounts(Request $request, StockOpname $stockOpname, StockOpnameService $service): RedirectResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'integer', 'distinct'],
            'items.*.physical_stock' => ['required', 'numeric', 'min:0', 'max:999999999999'],
        ]);
        $service->saveCounts($request->user(), $stockOpname, $data['items']);

        return back()->with('success', 'Hasil hitung fisik berhasil disimpan.');
    }

    public function submit(Request $request, StockOpname $stockOpname, StockOpnameService $service): RedirectResponse
    {
        $service->submit($request->user(), $stockOpname);

        return back()->with('success', 'Stock opname dikirim kepada owner untuk persetujuan.');
    }

    public function returnToCounting(Request $request, StockOpname $stockOpname, StockOpnameService $service): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:3', 'max:1000']]);
        $service->returnToCounting($request->user(), $stockOpname, $data['reason']);

        return back()->with('success', 'Sesi dikembalikan untuk dihitung ulang.');
    }

    public function post(Request $request, StockOpname $stockOpname, StockOpnameService $service): RedirectResponse
    {
        $service->post($request->user(), $stockOpname);

        return back()->with('success', 'Stock opname berhasil diposting ke riwayat stok.');
    }

    public function cancel(Request $request, StockOpname $stockOpname, StockOpnameService $service): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:3', 'max:1000']]);
        $service->cancel($request->user(), $stockOpname, $data['reason']);

        return back()->with('success', 'Sesi stock opname dibatalkan tanpa mengubah stok.');
    }

    private function authorizeTenant(Request $request, StockOpname $stockOpname): void
    {
        abort_unless($stockOpname->tenant_id === $request->user()->tenant_id, 404);
    }
}
