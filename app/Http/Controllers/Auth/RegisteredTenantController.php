<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\SalesProfile;
use App\Models\Tenant;
use App\Models\User;
use App\Services\BranchNetworkService;
use App\Services\ConsolidatedBillingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredTenantController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/Register', [
            'googleAuthEnabled' => (bool) (config('services.google.client_id') && config('services.google.client_secret')),
            'branchNetworkEnabled' => (bool) config('billing.branch_network_enabled'),
        ]);
    }

    public function store(Request $request, BranchNetworkService $network, ConsolidatedBillingService $billing): RedirectResponse
    {
        $request->merge(['referral_code' => SalesProfile::normalizeReferralCode($request->input('referral_code')), 'account_type' => $request->input('account_type', 'standalone')]);
        $request->merge(['network_code' => BranchNetworkService::normalizeCode($request->input('network_code'))]);
        $data = $request->validate([
            'store_name' => ['required', 'string', 'max:255'],
            'owner_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:tenants,email'],
            'phone' => ['required', 'string', 'max:30'],
            'username' => ['required', 'string', 'max:255', 'regex:/^[A-Za-z0-9._-]+$/', 'unique:users,username'],
            'password' => ['required', 'confirmed', Password::min(8)],
            'referral_code' => ['nullable', 'string', 'prohibited_if:account_type,branch', Rule::exists('sales_profiles', 'referral_code')->where('status', 'active')],
            'account_type' => ['required', Rule::in(config('billing.branch_network_enabled') ? ['standalone', 'branch'] : ['standalone'])],
            'network_code' => ['nullable', 'required_if:account_type,branch', 'string', 'regex:/^[A-Z0-9_-]{4,30}$/', Rule::exists('tenants', 'branch_network_code')->where('tenant_type', 'central')->where('status', 'active')],
        ], [
            'referral_code.exists' => 'Kode referral tidak ditemukan atau sudah tidak aktif.',
            'network_code.exists' => 'Kode jaringan tidak ditemukan atau tenant pusat tidak aktif.',
        ]);

        if ($data['account_type'] === 'branch' && ! empty($data['referral_code'])) {
            throw ValidationException::withMessages(['referral_code' => 'Pendaftaran cabang tidak dapat menggunakan kode referral sales.']);
        }

        $user = DB::transaction(function () use ($data, $network, $billing) {
            $sales = isset($data['referral_code']) ? SalesProfile::where('referral_code', $data['referral_code'])->where('status', 'active')->first() : null;
            $tenant = Tenant::create([
                'name' => $data['store_name'],
                'email' => $data['email'],
                'phone' => $data['phone'],
                'status' => 'active',
                'referred_by_sales_id' => $sales?->id,
                'referral_code_used' => $sales?->referral_code,
                'referred_at' => $sales ? now() : null,
                'tenant_type' => $data['account_type'] === 'branch' ? 'branch' : 'standalone',
            ]);
            $user = User::create(['tenant_id' => $tenant->id, 'name' => $data['owner_name'], 'username' => $data['username'], 'email' => $data['email'], 'password' => Hash::make($data['password']), 'role' => UserRole::Owner]);
            $subscription = $tenant->subscription;
            if ($data['account_type'] === 'branch') {
                $parent = Tenant::query()->where('branch_network_code', $data['network_code'])->firstOrFail();
                $network->requestJoin($parent, $tenant, $user, null, true);
            } else {
                $trialEnd = now()->addDays(config('billing.trial_days'));
                $subscription->update(['status' => 'trialing', 'is_grandfathered' => false, 'trial_ends_at' => $trialEnd]);
                $billing->createInvoice($tenant, $trialEnd, $trialEnd->copy()->addMonth(), $trialEnd);
            }

            return $user;
        });

        Auth::login($user);
        $request->session()->regenerate();

        if ($data['account_type'] === 'branch') {
            return redirect()->route('tenant.billing.index')->with('success', 'Pengajuan cabang dikirim. Akses dimulai setelah persetujuan pusat dan superadmin.');
        }

        return redirect()->route('tenant.dashboard')->with('success', 'Akun berhasil dibuat. Trial 7 hari Anda sudah aktif.');
    }
}
