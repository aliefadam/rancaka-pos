<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Support\PermissionCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RoleController extends Controller
{
    public function index(Request $request): Response
    {
        $tenantId = $request->user()->tenant_id;

        $roles = Role::query()
            ->where('tenant_id', $tenantId)
            ->withCount('employees')
            ->orderBy('name')
            ->get();

        return Inertia::render('Tenant/Roles/Index', [
            'roles' => $roles,
            'menus' => PermissionCatalog::menus(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validated($request);

        $request->user()->tenant->roles()->create($validated);

        return redirect()->route('tenant.roles.index')->with('success', 'Role berhasil ditambahkan.');
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        $this->authorizeTenant($request, $role);

        $validated = $this->validated($request, $role);

        $role->update($validated);

        return redirect()->route('tenant.roles.index')->with('success', 'Role berhasil diperbarui.');
    }

    public function destroy(Request $request, Role $role): RedirectResponse
    {
        $this->authorizeTenant($request, $role);

        $role->delete();

        return redirect()->route('tenant.roles.index')->with('success', 'Role berhasil dihapus.');
    }

    private function authorizeTenant(Request $request, Role $role): void
    {
        abort_unless($role->tenant_id === $request->user()->tenant_id, 403);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Role $role = null): array
    {
        $validated = $request->validate([
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('roles', 'name')
                    ->where('tenant_id', $request->user()->tenant_id)
                    ->ignore($role?->id),
            ],
            'permissions' => ['array'],
            'permissions.*' => [Rule::in(PermissionCatalog::keys())],
        ]);

        $validated['permissions'] = array_values($validated['permissions'] ?? []);

        return $validated;
    }
}
