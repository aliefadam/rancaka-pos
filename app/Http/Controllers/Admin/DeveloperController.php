<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DeveloperController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Developers/Index', [
            'developers' => User::query()
                ->where('role', UserRole::Developer)
                ->withCount('assignedDevelopmentTickets')
                ->orderBy('name')
                ->get(['id', 'name', 'username', 'email', 'created_at']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        User::create([...$data, 'role' => UserRole::Developer, 'tenant_id' => null]);

        return back()->with('success', 'Akun developer berhasil dibuat.');
    }

    public function update(Request $request, User $developer): RedirectResponse
    {
        $this->ensureDeveloper($developer);
        $data = $this->validated($request, $developer);
        if (empty($data['password'])) {
            unset($data['password']);
        }
        $developer->update($data);

        return back()->with('success', 'Akun developer berhasil diperbarui.');
    }

    public function destroy(User $developer): RedirectResponse
    {
        $this->ensureDeveloper($developer);
        $developer->delete();

        return back()->with('success', 'Akun developer berhasil dihapus. Tiketnya tetap tersimpan.');
    }

    private function validated(Request $request, ?User $developer = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'regex:/^[A-Za-z0-9._-]+$/', Rule::unique('users')->ignore($developer?->id)],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users')->ignore($developer?->id)],
            'password' => [Rule::requiredIf(! $developer), 'nullable', 'string', 'min:8'],
        ]);
    }

    private function ensureDeveloper(User $developer): void
    {
        abort_unless($developer->isDeveloper(), 404);
    }
}
