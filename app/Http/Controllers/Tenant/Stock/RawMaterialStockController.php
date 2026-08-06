<?php

namespace App\Http\Controllers\Tenant\Stock;

use App\Enums\StockMovementType;
use App\Http\Controllers\Controller;
use App\Models\RawMaterial;
use App\Models\StockMovement;
use App\Services\StockMovementService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RawMaterialStockController extends Controller
{
    public function index(Request $request): Response
    {
        $tenantId = $request->user()->tenant_id;
        $search = $request->string('search')->toString();
        $historySearch = $request->string('history_search')->toString();

        $rawMaterials = RawMaterial::where('tenant_id', $tenantId)
            ->when($search, fn ($query, $search) => $query->where('name', 'like', "%{$search}%"))
            ->orderBy('name')
            ->get(['id', 'name', 'stock', 'unit']);

        return Inertia::render('Tenant/Stock/RawMaterials/Index', [
            'items' => $rawMaterials,
            'filters' => ['search' => $search],
            'history' => Inertia::lazy(fn () => StockMovement::where('tenant_id', $tenantId)
                ->where('stockable_type', RawMaterial::class)
                ->with(['stockable:id,name,unit', 'user:id,name'])
                ->when($historySearch, function ($query, $historySearch) {
                    $query->whereHasMorph('stockable', [RawMaterial::class], fn ($q) => $q->where('name', 'like', "%{$historySearch}%"));
                })
                ->latest()
                ->paginate(8, ['*'], 'history_page')
                ->withQueryString()),
        ]);
    }

    public function storeIn(Request $request): RedirectResponse
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'raw_material_id' => ['required', Rule::exists('raw_materials', 'id')->where('tenant_id', $tenantId)],
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $rawMaterial = RawMaterial::where('tenant_id', $tenantId)->findOrFail($validated['raw_material_id']);

        StockMovementService::record(
            $rawMaterial,
            StockMovementType::In,
            $validated['quantity'],
            $validated['note'] ?? null,
            $request->user()->id,
        );

        return redirect()->route('tenant.stock.raw-materials.index')->with('success', 'Stok masuk berhasil dicatat.');
    }

    public function storeAdjustment(Request $request): RedirectResponse
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'raw_material_id' => ['required', Rule::exists('raw_materials', 'id')->where('tenant_id', $tenantId)],
            'direction' => ['required', Rule::in(['increase', 'decrease'])],
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($request, $tenantId, $validated) {
            $rawMaterial = RawMaterial::where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->findOrFail($validated['raw_material_id']);

            $isDecrease = $validated['direction'] === 'decrease';

            if ($isDecrease && $validated['quantity'] > $rawMaterial->stock) {
                throw ValidationException::withMessages([
                    'quantity' => "Jumlah melebihi stok saat ini ({$rawMaterial->stock}).",
                ]);
            }

            $quantity = $isDecrease ? -$validated['quantity'] : $validated['quantity'];
            $notePrefix = $isDecrease ? 'Pengurangan' : 'Penambahan';

            StockMovementService::record(
                $rawMaterial,
                StockMovementType::Adjustment,
                $quantity,
                "{$notePrefix}: {$validated['reason']}",
                $request->user()->id,
            );
        });

        return redirect()->route('tenant.stock.raw-materials.index')->with('success', 'Penyesuaian stok berhasil disimpan.');
    }
}
