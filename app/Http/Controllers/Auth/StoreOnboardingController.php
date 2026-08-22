<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\SalesProfile;
use App\Models\Tenant;
use App\Services\BranchNetworkService;
use App\Services\ConsolidatedBillingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class StoreOnboardingController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        if ($request->user()->tenant_id) {
            return redirect()->route('tenant.dashboard');
        }

        return Inertia::render('Auth/StoreOnboarding', [
            'user' => $request->user()->only(['name', 'username', 'email', 'avatar_url']),
            'referralCode' => $request->session()->get('registration_referral_code', ''),
            'networkCode' => $request->session()->get('registration_network_code', ''),
            'accountType' => $request->session()->get('registration_account_type', 'standalone'),
            'branchNetworkEnabled' => (bool) config('billing.branch_network_enabled'),
        ]);
    }

    public function store(Request $request, BranchNetworkService $network, ConsolidatedBillingService $billing): RedirectResponse
    {
        abort_if($request->user()->tenant_id, 403);
        $user = $request->user();
        $request->merge(['referral_code' => SalesProfile::normalizeReferralCode($request->input('referral_code')), 'account_type' => $request->input('account_type', 'standalone')]);
        $request->merge(['network_code' => BranchNetworkService::normalizeCode($request->input('network_code'))]);
        $data = $request->validate([
            'store_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:500'],
            'username' => ['required', 'string', 'max:255', 'regex:/^[A-Za-z0-9._-]+$/', Rule::unique('users', 'username')->ignore($user->id)],
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

        DB::transaction(function () use ($user, $data, $network, $billing) {
            $sales = isset($data['referral_code']) ? SalesProfile::where('referral_code', $data['referral_code'])->where('status', 'active')->first() : null;
            $tenant = Tenant::create([
                'name' => $data['store_name'],
                'email' => $user->email,
                'phone' => $data['phone'],
                'address' => $data['address'] ?? null,
                'status' => 'active',
                'referred_by_sales_id' => $sales?->id,
                'referral_code_used' => $sales?->referral_code,
                'referred_at' => $sales ? now() : null,
                'tenant_type' => $data['account_type'] === 'branch' ? 'branch' : 'standalone',
            ]);
            $subscription = $tenant->subscription;
            $user->update(['tenant_id' => $tenant->id, 'username' => $data['username']]);
            if ($data['account_type'] === 'branch') {
                $parent = Tenant::query()->where('branch_network_code', $data['network_code'])->firstOrFail();
                $network->requestJoin($parent, $tenant, $user, null, true);
            } else {
                $trialEnd = now()->addDays(config('billing.trial_days'));
                $subscription->update(['status' => 'trialing', 'is_grandfathered' => false, 'trial_ends_at' => $trialEnd]);
                $billing->createInvoice($tenant, $trialEnd, $trialEnd->copy()->addMonth(), $trialEnd);
            }
        });

        $request->session()->forget(['registration_referral_code', 'registration_network_code', 'registration_account_type']);

        return $data['account_type'] === 'branch'
            ? redirect()->route('tenant.billing.index')->with('success', 'Pengajuan cabang dikirim dan menunggu persetujuan.')
            : redirect()->route('tenant.dashboard')->with('success', 'Toko berhasil dibuat. Trial 7 hari Anda sudah aktif.');
    }
}
