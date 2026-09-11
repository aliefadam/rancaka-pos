<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\StockTransfer;
use App\Services\StockTransferService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StockTransferController extends Controller
{
    public function index(Request $request, StockTransferService $service): Response
    {
        $tenant = $request->user()->tenant;
        $filters = $request->validate([
            'status' => ['nullable', 'in:in_transit,received,cancelled,rejected'],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $transfers = StockTransfer::query()
            ->where(fn ($query) => $query->where('source_tenant_id', $tenant->id)->orWhere('destination_tenant_id', $tenant->id))
            ->with(['sourceTenant:id,name', 'destinationTenant:id,name', 'creator:id,name'])
            ->withCount('items')->withSum('items as total_quantity', 'quantity')
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($filters['search'] ?? null, fn ($query, $search) => $query->where('number', 'like', "%{$search}%"))
            ->latest('id')->paginate(12)->withQueryString();

        $destinations = $service->destinations($tenant);

        return Inertia::render('Tenant/StockTransfers/Index', [
            'transfers' => $transfers,
            'filters' => ['status' => $filters['status'] ?? '', 'search' => $filters['search'] ?? ''],
            'tenantId' => $tenant->id,
            'destinations' => $destinations->map(fn ($destination) => [
                'id' => $destination->id,
                'name' => $destination->name,
                'products' => $service->transferableProducts($tenant, $destination->id)
                    ->map(fn ($product) => ['id' => $product->id, 'name' => $product->name, 'stock' => $product->stock]),
            ]),
        ]);
    }

    public function store(Request $request, StockTransferService $service): RedirectResponse
    {
        $data = $request->validate([
            'destination_tenant_id' => ['required', 'integer'],
            'note' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => ['required', 'integer', 'distinct'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999999999'],
        ]);
        $transfer = $service->create($request->user(), $data);

        return redirect()->route('tenant.stock-transfers.show', $transfer)->with('success', "Transfer {$transfer->number} berhasil dikirim.");
    }

    public function show(Request $request, StockTransfer $stockTransfer): Response
    {
        $this->authorizeParticipant($request, $stockTransfer);
        $stockTransfer->load([
            'sourceTenant:id,name', 'destinationTenant:id,name', 'creator:id,name', 'receiver:id,name',
            'canceller:id,name', 'rejecter:id,name', 'items.sourceProduct:id,name', 'items.destinationProduct:id,name',
        ]);

        return Inertia::render('Tenant/StockTransfers/Show', [
            'transfer' => $stockTransfer,
            'tenantId' => $request->user()->tenant_id,
        ]);
    }

    public function receive(Request $request, StockTransfer $stockTransfer, StockTransferService $service): RedirectResponse
    {
        $service->receive($request->user(), $stockTransfer);

        return back()->with('success', 'Transfer diterima dan stok tujuan berhasil ditambahkan.');
    }

    public function cancel(Request $request, StockTransfer $stockTransfer, StockTransferService $service): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:1000']]);
        $service->cancel($request->user(), $stockTransfer, $data['reason']);

        return back()->with('success', 'Transfer dibatalkan dan stok dikembalikan.');
    }

    public function reject(Request $request, StockTransfer $stockTransfer, StockTransferService $service): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:1000']]);
        $service->reject($request->user(), $stockTransfer, $data['reason']);

        return back()->with('success', 'Transfer ditolak dan stok dikembalikan ke pengirim.');
    }

    private function authorizeParticipant(Request $request, StockTransfer $transfer): void
    {
        abort_unless(in_array($request->user()->tenant_id, [$transfer->source_tenant_id, $transfer->destination_tenant_id], true), 403);
    }
}
