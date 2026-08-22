<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Notifications\SupplierPayableNotification;
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
        $originalUserId = $request->session()->get('impersonation.original_user_id');
        $originalUser = $originalUserId
            ? User::query()->find($originalUserId)
            : null;

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
                'permissions' => $user?->isEmployee()
                    ? $user->effectivePermissions()
                    : null,
                'impersonation' => ($originalUser?->isSuperadmin() || $originalUser?->isOwner()) && $user?->tenant
                    ? [
                        'admin_name' => $originalUser->name,
                        'actor_role' => $originalUser->role->value,
                        'tenant_name' => $user->tenant->name,
                    ]
                    : null,
                'network' => $user?->tenant ? [
                    'enabled' => (bool) config('billing.branch_network_enabled'),
                    'tenant_type' => $user->tenant->tenant_type,
                    'unread_notifications' => $user->unreadNotifications()->count(),
                ] : null,
                'supplier_payable_notifications' => $user?->tenant
                    ? $user->unreadNotifications()->where('type', SupplierPayableNotification::class)->count()
                    : 0,
            ],
            'features' => [
                'branch_network' => (bool) config('billing.branch_network_enabled'),
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'transaction_id' => fn () => $request->session()->get('transaction_id'),
                'receipt_url' => fn () => $request->session()->get('receipt_url'),
                'bridge_receipt_url' => fn () => $request->session()->get('bridge_receipt_url'),
                'credit_payment_amount' => fn () => $request->session()->get('credit_payment_amount'),
                'credit_payment_remaining' => fn () => $request->session()->get('credit_payment_remaining'),
                'import_errors' => fn () => $request->session()->get('import_errors'),
            ],
        ];
    }
}
