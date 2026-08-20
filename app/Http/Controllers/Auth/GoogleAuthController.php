<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\SalesProfile;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirectResponse;
use Throwable;

class GoogleAuthController extends Controller
{
    public function redirect(Request $request): SymfonyRedirectResponse
    {
        abort_unless(config('services.google.client_id') && config('services.google.client_secret'), 503, 'Login Google belum dikonfigurasi.');

        $code = SalesProfile::normalizeReferralCode($request->query('referral_code'));
        if ($code && ! SalesProfile::query()->where('referral_code', $code)->where('status', 'active')->exists()) {
            return redirect()->route('register')->withErrors([
                'referral_code' => 'Kode referral tidak ditemukan atau sudah tidak aktif.',
            ]);
        }

        if ($code) {
            $request->session()->put('registration_referral_code', $code);
        } else {
            $request->session()->forget('registration_referral_code');
        }

        return Socialite::driver('google')->redirect();
    }

    public function callback(): RedirectResponse
    {
        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (Throwable) {
            return redirect()->route('login')->with('status', 'Login Google gagal atau dibatalkan. Silakan coba lagi.');
        }

        if (! $googleUser->getEmail()) {
            return redirect()->route('login')->with('status', 'Akun Google tidak memberikan alamat email.');
        }

        $user = User::query()->where('google_id', $googleUser->getId())
            ->orWhere('email', $googleUser->getEmail())->first();

        $user ??= Tenant::query()
            ->where('email', $googleUser->getEmail())
            ->with('owner')
            ->first()
            ?->owner;

        if ($user) {
            $user->update([
                'google_id' => $googleUser->getId(),
                'email' => $googleUser->getEmail(),
                'avatar_url' => $googleUser->getAvatar(),
                'email_verified_at' => $user->email_verified_at ?? now(),
            ]);
        } else {
            $user = User::create([
                'name' => $googleUser->getName() ?: 'Owner Toko',
                'username' => $this->uniqueUsername($googleUser->getEmail(), $googleUser->getName()),
                'email' => $googleUser->getEmail(),
                'google_id' => $googleUser->getId(),
                'avatar_url' => $googleUser->getAvatar(),
                'email_verified_at' => now(),
                'password' => null,
                'role' => UserRole::Owner,
            ]);
        }

        if ($user->tenant && $user->tenant->status !== 'active') {
            return redirect()->route('login')->with('status', 'Tenant sedang dinonaktifkan. Hubungi administrator.');
        }

        Auth::login($user, true);
        request()->session()->regenerate();

        if (! $user->tenant_id) {
            return redirect()->route('onboarding.store.create');
        }

        return redirect()->intended(route($user->isSuperadmin() ? 'admin.dashboard' : 'tenant.dashboard'));
    }

    private function uniqueUsername(?string $email, ?string $name): string
    {
        $candidate = Str::before((string) $email, '@') ?: Str::slug((string) $name, '.');
        $base = Str::lower(preg_replace('/[^A-Za-z0-9._-]/', '', $candidate) ?: 'owner');
        $username = Str::limit($base, 40, '');
        $suffix = 1;

        while (User::where('username', $username)->exists()) {
            $username = Str::limit($base, 35, '').'.'.$suffix++;
        }

        return $username;
    }
}
