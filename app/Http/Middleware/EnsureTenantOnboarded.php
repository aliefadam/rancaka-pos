<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantOnboarded
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->tenant_id) {
            return redirect()->route('onboarding.store.create');
        }

        return $next($request);
    }
}
