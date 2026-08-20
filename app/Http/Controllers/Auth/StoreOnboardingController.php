<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\BillingInvoice;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class StoreOnboardingController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        if ($request->user()->tenant_id) {
            return redirect()->route('tenant.dashboard');
        }

        return Inertia::render('Auth/StoreOnboarding', ['user' => $request->user()->only(['name', 'username', 'email', 'avatar_url'])]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_if($request->user()->tenant_id, 403);
        $user = $request->user();
        $data = $request->validate([
            'store_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:500'],
            'username' => ['required', 'string', 'max:255', 'regex:/^[A-Za-z0-9._-]+$/', Rule::unique('users', 'username')->ignore($user->id)],
        ]);

        DB::transaction(function () use ($user, $data) {
            $tenant = Tenant::create(['name' => $data['store_name'], 'email' => $user->email, 'phone' => $data['phone'], 'address' => $data['address'] ?? null, 'status' => 'active']);
            $trialEnd = now()->addDays(config('billing.trial_days'));
            $subscription = $tenant->subscription;
            $subscription->update(['status' => 'trialing', 'is_grandfathered' => false, 'trial_ends_at' => $trialEnd]);
            BillingInvoice::create(['tenant_id' => $tenant->id, 'subscription_id' => $subscription->id, 'number' => 'INV-'.now()->format('YmdHis').'-'.$tenant->id.'-'.Str::upper(Str::random(4)), 'status' => 'open', 'amount' => $subscription->price, 'due_at' => $trialEnd, 'period_start' => $trialEnd, 'period_end' => $trialEnd->copy()->addMonth()]);
            $user->update(['tenant_id' => $tenant->id, 'username' => $data['username']]);
        });

        return redirect()->route('tenant.dashboard')->with('success', 'Toko berhasil dibuat. Trial 14 hari Anda sudah aktif.');
    }
}
