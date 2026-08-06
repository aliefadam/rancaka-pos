<?php

namespace App\Http\Controllers\Tenant\Stock;

use App\Enums\StockMovementType;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use App\Services\StockMovementService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProductStockController extends Controller
{
    public function index(Request $request): Response
    {
        $tenantId = $request->user()->tenant_id;
        $search = $request->string('search')->toString();
        $historySearch = $request->string('history_search')->toString();

        $products = Product::where('tenant_id', $tenantId)
            ->when($search, fn ($query, $search) => $query->where('name', 'like', "%{$search}%"))
            ->orderBy('name')
            ->get(['id', 'name', 'stock', 'track_stock']);

        return Inertia::render('Tenant/Stock/Products/Index', [
            'items' => $products,
            'filters' => ['search' => $search],
            'history' => Inertia::lazy(fn () => StockMovement::where('tenant_id', $tenantId)
                ->where('stockable_type', Product::class)
                ->with(['stockable:id,name', 'user:id,name'])
                ->when($historySearch, function ($query, $historySearch) {
                    $query->whereHasMorph('stockable', [Product::class], fn ($q) => $q->where('name', 'like', "%{$historySearch}%"));
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
            'product_id' => ['required', Rule::exists('products', 'id')->where('tenant_id', $tenantId)],
            'quantity' => ['required', 'integer', 'min:1'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $product = Product::where('tenant_id', $tenantId)->findOrFail($validated['product_id']);

        StockMovementService::record(
            $product,
            StockMovementType::In,
            $validated['quantity'],
            $validated['note'] ?? null,
            $request->user()->id,
        );

        return redirect()->route('tenant.stock.products.index')->with('success', 'Stok masuk berhasil dicatat.');
    }

    public function storeAdjustment(Request $request): RedirectResponse
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'product_id' => ['required', Rule::exists('products', 'id')->where('tenant_id', $tenantId)],
            'direction' => ['required', Rule::in(['increase', 'decrease'])],
            'quantity' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($request, $tenantId, $validated) {
            $product = Product::where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->findOrFail($validated['product_id']);

            $isDecrease = $validated['direction'] === 'decrease';

            if ($isDecrease && $validated['quantity'] > $product->stock) {
                throw ValidationException::withMessages([
                    'quantity' => "Jumlah melebihi stok saat ini ({$product->stock}).",
                ]);
            }

            $quantity = $isDecrease ? -$validated['quantity'] : $validated['quantity'];
            $notePrefix = $isDecrease ? 'Pengurangan' : 'Penambahan';

            StockMovementService::record(
                $product,
                StockMovementType::Adjustment,
                $quantity,
                "{$notePrefix}: {$validated['reason']}",
                $request->user()->id,
            );
        });

        return redirect()->route('tenant.stock.products.index')->with('success', 'Penyesuaian stok berhasil disimpan.');
    }
}
