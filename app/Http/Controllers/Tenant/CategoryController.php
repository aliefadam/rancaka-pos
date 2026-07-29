<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $status = $request->string('status')->toString();

        $categories = Category::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->when($search, fn ($query, $search) => $query->where('name', 'like', "%{$search}%"))
            ->when($status, fn ($query, $status) => $query->where('is_active', $status === 'active'))
            ->orderBy('name')
            ->get();

        return Inertia::render('Tenant/Categories/Index', [
            'categories' => $categories,
            'filters' => ['search' => $search, 'status' => $status],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validated($request);

        $request->user()->tenant->categories()->create($validated);

        return redirect()->route('tenant.categories.index')->with('success', 'Kategori berhasil ditambahkan.');
    }

    public function update(Request $request, Category $category): RedirectResponse
    {
        $this->authorizeTenant($request, $category);

        $validated = $this->validated($request, $category);

        $category->update($validated);

        return redirect()->route('tenant.categories.index')->with('success', 'Kategori berhasil diperbarui.');
    }

    public function destroy(Request $request, Category $category): RedirectResponse
    {
        $this->authorizeTenant($request, $category);

        if ($category->products()->exists()) {
            return redirect()->route('tenant.categories.index')
                ->with('error', 'Kategori tidak dapat dihapus karena masih digunakan oleh produk.');
        }

        $category->delete();

        return redirect()->route('tenant.categories.index')->with('success', 'Kategori berhasil dihapus.');
    }

    private function authorizeTenant(Request $request, Category $category): void
    {
        abort_unless($category->tenant_id === $request->user()->tenant_id, 403);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Category $category = null): array
    {
        return $request->validate([
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('categories', 'name')
                    ->where('tenant_id', $request->user()->tenant_id)
                    ->ignore($category?->id),
            ],
            'icon' => ['required', 'string', 'max:100'],
            'is_active' => ['boolean'],
        ]);
    }
}
