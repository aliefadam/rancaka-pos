<?php

namespace App\Http\Middleware;

use App\Services\BranchNetworkService;
use App\Services\SubscriptionLifecycleService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantSubscriptionActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $tenant = $user?->tenant;

        abort_unless($tenant && $tenant->status === 'active', 403, 'Tenant tidak aktif.');

        app(SubscriptionLifecycleService::class)->sync($tenant->subscription);

        if (! app(BranchNetworkService::class)->allowsAccess($tenant)) {
            $message = $tenant->currentBranchRelationship
                ? 'Akses jaringan belum aktif atau tagihan pusat belum dibayar. Hubungi owner pusat.'
                : ($tenant->subscription?->status === 'trial_expired'
                    ? 'Masa trial telah habis. Aktifkan langganan untuk melanjutkan.'
                    : 'Masa tenggang telah habis. Akun dibekukan sampai pembayaran langganan disetujui.');

            return redirect()->route('tenant.billing.index')->with('error', $message);
        }

        return $next($request);
    }
}
