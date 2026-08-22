<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\TenantBranchRelationship;
use App\Models\TenantImpersonationLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class ImpersonationController extends Controller
{
    private const SESSION_KEY = 'impersonation.original_user_id';

    private const LOG_KEY = 'impersonation.log_id';

    public function start(Request $request, Tenant $tenant): RedirectResponse
    {
        $actor = $request->user();
        $relationship = TenantBranchRelationship::query()
            ->where('branch_tenant_id', $tenant->id)
            ->whereIn('status', ['approved_pending_billing', 'active', 'exit_requested', 'detached_pending'])
            ->latest()->first();
        $isRelatedOwner = $actor?->isOwner() && $relationship?->parent_tenant_id === $actor->tenant_id;
        abort_unless($actor?->isSuperadmin() || $isRelatedOwner, 403);
        if ($isRelatedOwner) {
            abort_unless($tenant->status === 'active' && $relationship->status !== 'detached', 403);
        }

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

        $log = TenantImpersonationLog::create([
            'actor_user_id' => $actor->id,
            'parent_tenant_id' => $relationship?->parent_tenant_id,
            'branch_tenant_id' => $tenant->id,
            'impersonated_user_id' => $owner->id,
            'started_at' => now(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
        $request->session()->put([self::SESSION_KEY => $actor->id, self::LOG_KEY => $log->id]);
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
        abort_unless($admin?->isSuperadmin() || $admin?->isOwner(), 403);

        TenantImpersonationLog::query()->whereKey($request->session()->get(self::LOG_KEY))->whereNull('ended_at')->update(['ended_at' => now()]);
        $request->session()->forget([self::SESSION_KEY, self::LOG_KEY]);
        Auth::login($admin);
        $request->session()->regenerate();

        return redirect()->route($admin->isSuperadmin() ? 'admin.tenants.index' : 'tenant.network.index')
            ->with('success', 'Mode impersonate telah dihentikan.');
    }
}
