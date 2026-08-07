<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class CashierSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::query()
            ->where('name', 'Kedai Josjis')
            ->first();

        if (! $tenant) {
            throw new RuntimeException('Tenant Kedai Josjis belum tersedia. Jalankan DatabaseSeeder terlebih dahulu.');
        }

        User::query()->updateOrCreate(
            ['username' => 'kasir.josjis'],
            [
                'name' => 'Kasir Kedai Josjis',
                'password' => Hash::make('123123'),
                'role' => UserRole::Employee,
                'tenant_id' => $tenant->id,
            ],
        );
    }
}
