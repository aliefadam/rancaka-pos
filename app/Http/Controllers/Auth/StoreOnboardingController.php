<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\BillingInvoice;
use App\Models\SalesProfile;
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

        return Inertia::render('Auth/StoreOnboarding', [
            'user' => $request->user()->only(['name', 'username', 'email', 'avatar_url']),
            'referralCode' => $request->session()->get('registration_referral_code', ''),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_if($request->user()->tenant_id, 403);
        $user = $request->user();
        $request->merge(['referral_code' => SalesProfile::normalizeReferralCode($request->input('referral_code'))]);
        $data = $request->validate([
            'store_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:500'],
            'username' => ['required', 'string', 'max:255', 'regex:/^[A-Za-z0-9._-]+$/', Rule::unique('users', 'username')->ignore($user->id)],
            'referral_code' => ['nullable', 'string', Rule::exists('sales_profiles', 'referral_code')->where('status', 'active')],
        ], [
            'referral_code.exists' => 'Kode referral tidak ditemukan atau sudah tidak aktif.',
        ]);

        DB::transaction(function () use ($user, $data) {
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
            ]);
            $trialEnd = now()->addDays(config('billing.trial_days'));
            $subscription = $tenant->subscription;
            $subscription->update(['status' => 'trialing', 'is_grandfathered' => false, 'trial_ends_at' => $trialEnd]);
            BillingInvoice::create(['tenant_id' => $tenant->id, 'subscription_id' => $subscription->id, 'number' => 'INV-'.now()->format('YmdHis').'-'.$tenant->id.'-'.Str::upper(Str::random(4)), 'status' => 'open', 'amount' => $subscription->price, 'due_at' => $trialEnd, 'period_start' => $trialEnd, 'period_end' => $trialEnd->copy()->addMonth()]);
            $user->update(['tenant_id' => $tenant->id, 'username' => $data['username']]);
        });

        $request->session()->forget('registration_referral_code');

        return redirect()->route('tenant.dashboard')->with('success', 'Toko berhasil dibuat. Trial 14 hari Anda sudah aktif.');
    }
}
