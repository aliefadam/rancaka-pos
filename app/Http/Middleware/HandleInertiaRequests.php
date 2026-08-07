<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user()?->loadMissing('employeeRole');

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
                'permissions' => $user?->isEmployee()
                    ? ($user->employeeRole?->permissions ?? [])
                    : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'transaction_id' => fn () => $request->session()->get('transaction_id'),
                'receipt_url' => fn () => $request->session()->get('receipt_url'),
                'bridge_receipt_url' => fn () => $request->session()->get('bridge_receipt_url'),
            ],
        ];
    }
}
