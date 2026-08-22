<?php

namespace App\Http\Controllers;

use App\Services\OptimizedUploadService;
use App\Support\UploadRules;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('Account/Edit', ['account' => $request->user()->only(['name', 'username', 'email', 'avatar_url', 'google_id'])]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'regex:/^[A-Za-z0-9._-]+$/', Rule::unique('users', 'username')->ignore($user->id)],
        ]);
        $user->update($data);

        return back()->with('success', 'Akun berhasil diperbarui.');
    }

    public function updateAvatar(Request $request, OptimizedUploadService $uploads): RedirectResponse
    {
        $data = $request->validate([
            'avatar' => UploadRules::image(),
        ]);

        $user = $request->user();
        $previousAvatar = $user->avatar_url;
        $path = $uploads->store($data['avatar'], 'avatars', 'public', 800, 800, 80);

        $user->update(['avatar_url' => Storage::disk('public')->url($path)]);

        if ($previousAvatar && str_starts_with($previousAvatar, '/storage/')) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $previousAvatar));
        }

        return back()->with('success', 'Foto profil berhasil diperbarui.');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $request->user()->update(['password' => Hash::make($data['password'])]);

        return back()->with('success', 'Password berhasil diperbarui.');
    }
}
