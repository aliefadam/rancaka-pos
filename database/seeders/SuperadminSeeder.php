<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SuperadminSeeder extends Seeder
{
    public function run(): void
    {
        $username = trim((string) config('superadmin.username', 'administrator')) ?: 'administrator';
        $configuredPassword = config('superadmin.password');
        $email = config('superadmin.email');

        $admin = User::query()->where('username', $username)->first();
        $legacyAdmin = $admin ? null : User::query()
            ->where('username', 'admin')
            ->where('role', UserRole::Superadmin)
            ->first();
        $admin ??= $legacyAdmin;

        $mustCreateOrRotate = ! $admin || $legacyAdmin;
        $password = $configuredPassword ?: ($mustCreateOrRotate ? Str::password(32) : null);

        $admin ??= new User;
        $admin->fill([
            'name' => 'Administrator',
            'username' => $username,
            'email' => $email ?: $admin->email,
            'role' => UserRole::Superadmin,
            'tenant_id' => null,
        ]);

        if ($password) {
            $admin->password = Hash::make($password);
        }

        $admin->save();

        $this->command?->info("Akun superadmin siap dengan username: {$username}");

        if ($password && ! $configuredPassword) {
            $this->command?->warn('Password acak ini hanya ditampilkan sekali. Simpan sekarang:');
            $this->command?->line($password);
        } elseif ($configuredPassword) {
            $this->command?->info('Password superadmin diterapkan dari SUPERADMIN_PASSWORD.');
        } else {
            $this->command?->comment('Password akun yang sudah ada tidak diubah.');
        }
    }
}
