<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class ImpersonationController extends Controller
{
    private const SESSION_KEY = 'impersonation.original_user_id';

    public function start(Request $request, Tenant $tenant): RedirectResponse
    {
        abort_unless($request->user()?->isSuperadmin(), 403);

        if ($request->session()->has(self::SESSION_KEY)) {
            throw ValidationException::withMessages([
                'impersonation' => 'Selesaikan sesi impersonate yang sedang aktif terlebih dahulu.',
            ]);
        }

        $owner = $tenant->owner()->first();
        if (! $owner) {
            throw ValidationException::withMessages([
                'impersonation' => 'Tenant ini belum memiliki akun owner untuk digunakan.',
            ]);
        }

        $request->session()->put(self::SESSION_KEY, $request->user()->id);
        Auth::login($owner);
        $request->session()->regenerate();

        return redirect()->route('tenant.dashboard')
            ->with('success', "Anda sekarang masuk sebagai owner {$tenant->name}.");
    }

    public function stop(Request $request): RedirectResponse
    {
        $originalUserId = $request->session()->get(self::SESSION_KEY);
        abort_unless($originalUserId, 403);

        $admin = User::query()->find($originalUserId);
        abort_unless($admin?->isSuperadmin(), 403);

        $request->session()->forget(self::SESSION_KEY);
        Auth::login($admin);
        $request->session()->regenerate();

        return redirect()->route('admin.tenants.index')
            ->with('success', 'Mode impersonate telah dihentikan.');
    }
}
