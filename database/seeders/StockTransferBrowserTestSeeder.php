<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\TenantBranchRelationship;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class StockTransferBrowserTestSeeder extends Seeder
{
    public function run(): void
    {
        $central = Tenant::query()->firstOrCreate(
            ['email' => 'e2e-transfer-central@rancaka.test'],
            ['name' => 'E2E Pusat Logistik', 'phone' => '080000000001', 'address' => 'Fixture Playwright', 'status' => 'active', 'tenant_type' => 'central', 'branch_network_code' => 'E2E-TRANSFER'],
        );
        $central->update(['status' => 'active', 'tenant_type' => 'central', 'branch_network_code' => 'E2E-TRANSFER']);

        $branch = Tenant::query()->firstOrCreate(
            ['email' => 'e2e-transfer-branch@rancaka.test'],
            ['name' => 'E2E Cabang Penerima', 'phone' => '080000000002', 'address' => 'Fixture Playwright', 'status' => 'active', 'tenant_type' => 'branch'],
        );
        $branch->update(['status' => 'active', 'tenant_type' => 'branch']);

        User::query()->updateOrCreate(
            ['username' => 'e2e.transfer.sender'],
            ['tenant_id' => $central->id, 'name' => 'E2E Pengirim', 'password' => Hash::make('Playwright123!'), 'role' => UserRole::Owner],
        );
        User::query()->updateOrCreate(
            ['username' => 'e2e.transfer.receiver'],
            ['tenant_id' => $branch->id, 'name' => 'E2E Penerima', 'password' => Hash::make('Playwright123!'), 'role' => UserRole::Owner],
        );

        TenantBranchRelationship::query()->updateOrCreate(
            ['parent_tenant_id' => $central->id, 'branch_tenant_id' => $branch->id],
            ['network_code_used' => 'E2E-TRANSFER', 'status' => 'active', 'requested_at' => now()->subMonth(), 'parent_approved_at' => now()->subMonth(), 'admin_approved_at' => now()->subMonth(), 'billing_effective_at' => now()->subDay()],
        );

        $centralCategory = Category::query()->firstOrCreate(['tenant_id' => $central->id, 'name' => 'E2E Minuman'], ['icon' => 'fi-rr-mug-hot', 'is_active' => true]);
        $branchCategory = Category::query()->firstOrCreate(['tenant_id' => $branch->id, 'name' => 'E2E Minuman'], ['source_category_id' => $centralCategory->id, 'icon' => 'fi-rr-mug-hot', 'is_active' => true]);
        if (! $branchCategory->source_category_id) {
            $branchCategory->update(['source_category_id' => $centralCategory->id]);
        }

        $source = Product::query()->updateOrCreate(
            ['tenant_id' => $central->id, 'name' => 'E2E Kopi Botol'],
            ['category_id' => $centralCategory->id, 'price' => 12000, 'cost' => 5000, 'margin_percentage' => 140, 'track_stock' => true, 'stock' => 20, 'is_active' => true],
        );
        Product::query()->updateOrCreate(
            ['tenant_id' => $branch->id, 'name' => 'E2E Kopi Botol'],
            ['source_product_id' => $source->id, 'category_id' => $branchCategory->id, 'price' => 12000, 'cost' => 5000, 'margin_percentage' => 140, 'track_stock' => true, 'stock' => 2, 'is_active' => true],
        );
    }
}
