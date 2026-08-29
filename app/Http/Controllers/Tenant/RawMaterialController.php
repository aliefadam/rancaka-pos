<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\RawMaterial;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RawMaterialController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $status = $request->string('status')->toString();

        $rawMaterials = RawMaterial::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->when($search, fn ($query, $search) => $query->where('name', 'like', "%{$search}%"))
            ->when($status, fn ($query, $status) => $query->where('is_active', $status === 'active'))
            ->orderBy('name')
            ->get();

        return Inertia::render('Tenant/RawMaterials/Index', [
            'rawMaterials' => $rawMaterials,
            'filters' => ['search' => $search, 'status' => $status],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validated($request);

        $validated['average_cost'] = (float) ($validated['average_cost'] ?? 0);
        if ((float) ($validated['stock'] ?? 0) > 0) {
            $validated['opening_cost_confirmed_at'] = now();
            $validated['opening_cost_confirmed_by'] = $request->user()->id;
        }

        $request->user()->tenant->rawMaterials()->create($validated);

        return redirect()->route('tenant.raw-materials.index')->with('success', 'Bahan baku berhasil ditambahkan.');
    }

    public function update(Request $request, RawMaterial $rawMaterial): RedirectResponse
    {
        $this->authorizeTenant($request, $rawMaterial);

        $validated = $this->validated($request, $rawMaterial);

        if ($rawMaterial->opening_cost_confirmed_at) {
            unset($validated['average_cost']);
        } else {
            $validated['average_cost'] = (float) ($validated['average_cost'] ?? 0);
            if ((float) ($validated['stock'] ?? 0) > 0) {
                $validated['opening_cost_confirmed_at'] = now();
                $validated['opening_cost_confirmed_by'] = $request->user()->id;
            }
        }

        $rawMaterial->update($validated);

        return redirect()->route('tenant.raw-materials.index')->with('success', 'Bahan baku berhasil diperbarui.');
    }

    public function destroy(Request $request, RawMaterial $rawMaterial): RedirectResponse
    {
        $this->authorizeTenant($request, $rawMaterial);

        $rawMaterial->delete();

        return redirect()->route('tenant.raw-materials.index')->with('success', 'Bahan baku berhasil dihapus.');
    }

    private function authorizeTenant(Request $request, RawMaterial $rawMaterial): void
    {
        abort_unless($rawMaterial->tenant_id === $request->user()->tenant_id, 403);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?RawMaterial $rawMaterial = null): array
    {
        return $request->validate([
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('raw_materials', 'name')
                    ->where('tenant_id', $request->user()->tenant_id)
                    ->ignore($rawMaterial?->id),
            ],
            'unit' => ['required', 'string', 'max:50'],
            'stock' => ['nullable', 'numeric', 'min:0'],
            'average_cost' => [
                Rule::requiredIf(
                    ! $rawMaterial?->opening_cost_confirmed_at
                    && (float) $request->input('stock', 0) > 0
                ),
                'nullable',
                'numeric',
                'min:0',
                'max:999999999999',
            ],
            'is_active' => ['boolean'],
        ], [
            'average_cost.required' => 'HPP awal wajib diisi jika stok bahan baku lebih dari 0.',
        ], [
            'average_cost' => 'HPP awal',
        ]);
    }
}
