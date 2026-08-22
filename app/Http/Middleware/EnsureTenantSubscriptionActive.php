<?php

namespace App\Http\Middleware;

use App\Services\BranchNetworkService;
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

        if (! app(BranchNetworkService::class)->allowsAccess($tenant)) {
            $message = $tenant->currentBranchRelationship
                ? 'Akses jaringan belum aktif atau tagihan pusat belum dibayar. Hubungi owner pusat.'
                : 'Masa aktif berakhir. Perbarui langganan untuk melanjutkan.';

            return redirect()->route('tenant.billing.index')->with('error', $message);
        }

        return $next($request);
    }
}
