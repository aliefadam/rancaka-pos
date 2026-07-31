<?php

namespace App\Http\Controllers\Tenant;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeController extends Controller
{
    public function index(Request $request): Response
    {
        $tenantId = $request->user()->tenant_id;
        $search = $request->string('search')->toString();

        $employees = User::query()
            ->where('tenant_id', $tenantId)
            ->where('role', UserRole::Employee)
            ->with('employeeRole:id,name')
            ->when($search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate(10)
            ->withQueryString();

        $roles = $request->user()->tenant->roles()->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Tenant/Employees/Index', [
            'employees' => $employees,
            'filters' => ['search' => $search],
            'roles' => $roles,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validated($request);

        $request->user()->tenant->users()->create([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'password' => Hash::make($validated['password']),
            'role' => UserRole::Employee,
            'employee_role_id' => $validated['employee_role_id'],
        ]);

        return redirect()->route('tenant.employees.index')->with('success', 'Karyawan berhasil ditambahkan.');
    }

    public function update(Request $request, User $employee): RedirectResponse
    {
        $this->authorizeTenant($request, $employee);

        $validated = $this->validated($request, $employee);

        $employee->update([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'employee_role_id' => $validated['employee_role_id'],
            ...(empty($validated['password']) ? [] : ['password' => Hash::make($validated['password'])]),
        ]);

        return redirect()->route('tenant.employees.index')->with('success', 'Karyawan berhasil diperbarui.');
    }

    public function destroy(Request $request, User $employee): RedirectResponse
    {
        $this->authorizeTenant($request, $employee);

        $employee->delete();

        return redirect()->route('tenant.employees.index')->with('success', 'Karyawan berhasil dihapus.');
    }

    private function authorizeTenant(Request $request, User $employee): void
    {
        abort_unless(
            $employee->tenant_id === $request->user()->tenant_id && $employee->role === UserRole::Employee,
            403
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?User $employee = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => [
                'required', 'string', 'max:255',
                Rule::unique('users', 'username')->ignore($employee?->id),
            ],
            'password' => [$employee ? 'nullable' : 'required', 'string', 'min:8'],
            'employee_role_id' => [
                'nullable',
                Rule::exists('roles', 'id')->where('tenant_id', $request->user()->tenant_id),
            ],
        ]);
    }
}
