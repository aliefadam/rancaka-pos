<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\BillingInvoice;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredTenantController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'store_name' => ['required', 'string', 'max:255'],
            'owner_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:tenants,email'],
            'phone' => ['required', 'string', 'max:30'],
            'username' => ['required', 'string', 'max:255', 'regex:/^[A-Za-z0-9._-]+$/', 'unique:users,username'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = DB::transaction(function () use ($data) {
            $tenant = Tenant::create(['name' => $data['store_name'], 'email' => $data['email'], 'phone' => $data['phone'], 'status' => 'active']);
            $user = User::create(['tenant_id' => $tenant->id, 'name' => $data['owner_name'], 'username' => $data['username'], 'password' => Hash::make($data['password']), 'role' => UserRole::Owner]);
            $trialEnd = now()->addDays(config('billing.trial_days'));
            $subscription = $tenant->subscription;
            $subscription->update(['status' => 'trialing', 'is_grandfathered' => false, 'trial_ends_at' => $trialEnd]);
            BillingInvoice::create(['tenant_id' => $tenant->id, 'subscription_id' => $subscription->id, 'number' => 'INV-'.now()->format('YmdHis').'-'.$tenant->id.'-'.Str::upper(Str::random(4)), 'status' => 'open', 'amount' => $subscription->price, 'due_at' => $trialEnd, 'period_start' => $trialEnd, 'period_end' => $trialEnd->copy()->addMonth()]);

            return $user;
        });

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('tenant.dashboard')->with('success', 'Akun berhasil dibuat. Trial 14 hari Anda sudah aktif.');
    }
}
