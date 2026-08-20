<?php

namespace App\Http\Middleware;

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

        if (! $tenant->subscription?->allowsAccess()) {
            return redirect()->route('tenant.billing.index')->with('error', 'Masa aktif berakhir. Perbarui langganan untuk melanjutkan.');
        }

        return $next($request);
    }
}
