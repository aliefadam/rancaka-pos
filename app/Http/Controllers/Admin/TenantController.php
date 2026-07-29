<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TenantController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $status = $request->string('status')->toString();

        $tenants = Tenant::query()
            ->when($search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->when($status, fn ($query, $status) => $query->where('status', $status))
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Admin/Tenants/Index', [
            'tenants' => $tenants,
            'filters' => ['search' => $search, 'status' => $status],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validated($request);

        $ownerCredentials = $request->validate([
            'owner_username' => ['required', 'string', 'max:255', 'unique:users,username'],
            'owner_password' => ['required', 'string', 'min:8'],
        ]);

        DB::transaction(function () use ($validated, $ownerCredentials) {
            $tenant = Tenant::create($validated);

            User::create([
                'name' => $tenant->name,
                'username' => $ownerCredentials['owner_username'],
                'password' => Hash::make($ownerCredentials['owner_password']),
                'role' => UserRole::Owner,
                'tenant_id' => $tenant->id,
            ]);
        });

        return redirect()->route('admin.tenants.index')->with('success', 'Tenant berhasil ditambahkan.');
    }

    public function update(Request $request, Tenant $tenant): RedirectResponse
    {
        $validated = $this->validated($request, $tenant);

        $tenant->update($validated);

        return redirect()->route('admin.tenants.index')->with('success', 'Tenant berhasil diperbarui.');
    }

    public function destroy(Tenant $tenant): RedirectResponse
    {
        $tenant->delete();

        return redirect()->route('admin.tenants.index')->with('success', 'Tenant berhasil dihapus.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Tenant $tenant = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required', 'string', 'email', 'max:255',
                Rule::unique('tenants', 'email')->ignore($tenant?->id),
            ],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:500'],
            'status' => ['required', 'in:active,inactive'],
        ]);
    }
}
