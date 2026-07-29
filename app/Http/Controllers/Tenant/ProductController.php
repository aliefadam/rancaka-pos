<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(Request $request): Response
    {
        $tenantId = $request->user()->tenant_id;
        $search = $request->string('search')->toString();
        $categoryId = $request->string('category_id')->toString();

        $products = Product::query()
            ->where('tenant_id', $tenantId)
            ->with(['category:id,name', 'rawMaterials'])
            ->when($search, fn ($query, $search) => $query->where('name', 'like', "%{$search}%"))
            ->when($categoryId, fn ($query, $categoryId) => $query->where('category_id', $categoryId))
            ->orderBy('name')
            ->get();

        return Inertia::render('Tenant/Products/Index', [
            'products' => $products,
            'categories' => $request->user()->tenant->categories()->orderBy('name')->get(['id', 'name']),
            'rawMaterials' => $request->user()->tenant->rawMaterials()->orderBy('name')->get(['id', 'name', 'unit']),
            'filters' => ['search' => $search, 'category_id' => $categoryId],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validated($request);
        $ingredients = $this->ingredientsMap($request);

        DB::transaction(function () use ($request, $validated, $ingredients) {
            $product = $request->user()->tenant->products()->create($validated);
            $product->rawMaterials()->sync($ingredients);
        });

        return redirect()->route('tenant.products.index')->with('success', 'Produk berhasil ditambahkan.');
    }

    public function update(Request $request, Product $product): RedirectResponse
    {
        $this->authorizeTenant($request, $product);

        $validated = $this->validated($request, $product);
        $ingredients = $this->ingredientsMap($request);

        DB::transaction(function () use ($product, $validated, $ingredients) {
            $product->update($validated);
            $product->rawMaterials()->sync($ingredients);
        });

        return redirect()->route('tenant.products.index')->with('success', 'Produk berhasil diperbarui.');
    }

    public function destroy(Request $request, Product $product): RedirectResponse
    {
        $this->authorizeTenant($request, $product);

        $product->delete();

        return redirect()->route('tenant.products.index')->with('success', 'Produk berhasil dihapus.');
    }

    private function authorizeTenant(Request $request, Product $product): void
    {
        abort_unless($product->tenant_id === $request->user()->tenant_id, 403);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Product $product = null): array
    {
        $tenantId = $request->user()->tenant_id;

        return $request->validate([
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('products', 'name')
                    ->where('tenant_id', $tenantId)
                    ->ignore($product?->id),
            ],
            'category_id' => [
                'required',
                Rule::exists('categories', 'id')->where('tenant_id', $tenantId),
            ],
            'price' => ['required', 'integer', 'min:0'],
            'track_stock' => ['boolean'],
            'stock' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
            'ingredients' => ['nullable', 'array'],
            'ingredients.*.raw_material_id' => [
                'required_with:ingredients',
                Rule::exists('raw_materials', 'id')->where('tenant_id', $tenantId),
            ],
            'ingredients.*.quantity' => ['required_with:ingredients', 'numeric', 'min:0.01'],
        ]);
    }

    /**
     * @return array<int, array{quantity: float}>
     */
    private function ingredientsMap(Request $request): array
    {
        $ingredients = $request->input('ingredients', []);

        $map = [];
        foreach ($ingredients as $ingredient) {
            if (empty($ingredient['raw_material_id'])) {
                continue;
            }

            $map[(int) $ingredient['raw_material_id']] = ['quantity' => $ingredient['quantity']];
        }

        return $map;
    }
}
