<?php

namespace App\Services;

use App\Models\BranchCatalogMigration;
use App\Models\Category;
use App\Models\Product;
use App\Models\TenantBranchRelationship;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class BranchCatalogMigrationService
{
    public function migrate(TenantBranchRelationship $relationship, User $actor): BranchCatalogMigration
    {
        abort_unless(
            $actor->isOwner() && $actor->tenant_id === $relationship->branch_tenant_id,
            403,
        );

        return DB::transaction(function () use ($relationship, $actor) {
            $relationship = TenantBranchRelationship::query()
                ->lockForUpdate()
                ->with(['parentTenant', 'branchTenant'])
                ->findOrFail($relationship->id);

            abort_unless(
                in_array($relationship->status, ['approved_pending_billing', 'active'], true)
                    && $relationship->branchTenant->isBranch(),
                422,
                'Migrasi katalog hanya tersedia untuk cabang yang sudah disetujui dan masih aktif.',
            );

            $centralCategories = Category::query()
                ->where('tenant_id', $relationship->parent_tenant_id)
                ->orderBy('id')
                ->get();
            $centralProducts = Product::query()
                ->where('tenant_id', $relationship->parent_tenant_id)
                ->with('priceOptions')
                ->orderBy('id')
                ->get();

            $counts = [
                'categories_created' => 0,
                'categories_matched' => 0,
                'products_created' => 0,
                'products_matched' => 0,
                'products_unchanged' => 0,
            ];
            $categoryMap = [];

            foreach ($centralCategories as $sourceCategory) {
                $branchCategory = Category::query()
                    ->where('tenant_id', $relationship->branch_tenant_id)
                    ->where('source_category_id', $sourceCategory->id)
                    ->first();

                if (! $branchCategory) {
                    $branchCategory = $this->categoryWithSameName(
                        $relationship->branch_tenant_id,
                        $sourceCategory->name,
                    );

                    if ($branchCategory) {
                        if ($branchCategory->source_category_id === null) {
                            $branchCategory->update(['source_category_id' => $sourceCategory->id]);
                        }
                        $counts['categories_matched']++;
                    } else {
                        $branchCategory = Category::query()->create([
                            'tenant_id' => $relationship->branch_tenant_id,
                            'source_category_id' => $sourceCategory->id,
                            'name' => $sourceCategory->name,
                            'icon' => $sourceCategory->icon,
                            'is_active' => $sourceCategory->is_active,
                        ]);
                        $counts['categories_created']++;
                    }
                }

                $categoryMap[$sourceCategory->id] = $branchCategory->id;
            }

            foreach ($centralProducts as $sourceProduct) {
                $branchProduct = Product::query()
                    ->where('tenant_id', $relationship->branch_tenant_id)
                    ->where('source_product_id', $sourceProduct->id)
                    ->first();

                if ($branchProduct) {
                    $counts['products_unchanged']++;

                    continue;
                }

                $branchProduct = $this->productWithSameName(
                    $relationship->branch_tenant_id,
                    $sourceProduct->name,
                );

                if ($branchProduct) {
                    if ($branchProduct->source_product_id === null) {
                        $branchProduct->update(['source_product_id' => $sourceProduct->id]);
                    }
                    $counts['products_matched']++;

                    continue;
                }

                $branchProduct = Product::query()->create([
                    'tenant_id' => $relationship->branch_tenant_id,
                    'source_product_id' => $sourceProduct->id,
                    'category_id' => $categoryMap[$sourceProduct->category_id],
                    'name' => $sourceProduct->name,
                    'price' => $sourceProduct->price,
                    'cost' => $sourceProduct->cost,
                    'margin_percentage' => $sourceProduct->margin_percentage,
                    'track_stock' => $sourceProduct->track_stock,
                    'stock' => 0,
                    'is_active' => $sourceProduct->is_active,
                ]);

                $priceOptions = $sourceProduct->priceOptions;
                if ($priceOptions->isEmpty()) {
                    $branchProduct->priceOptions()->create([
                        'name' => 'Harga utama',
                        'price' => $sourceProduct->price,
                        'is_default' => true,
                        'is_active' => true,
                        'sort_order' => 0,
                    ]);
                } else {
                    foreach ($priceOptions as $priceOption) {
                        $branchProduct->priceOptions()->create([
                            'name' => $priceOption->name,
                            'price' => $priceOption->price,
                            'is_default' => $priceOption->is_default,
                            'is_active' => $priceOption->is_active,
                            'sort_order' => $priceOption->sort_order,
                        ]);
                    }
                }

                $counts['products_created']++;
            }

            return BranchCatalogMigration::query()->create([
                'tenant_branch_relationship_id' => $relationship->id,
                'parent_tenant_id' => $relationship->parent_tenant_id,
                'branch_tenant_id' => $relationship->branch_tenant_id,
                'initiated_by' => $actor->id,
                ...$counts,
                'completed_at' => now(),
            ]);
        });
    }

    private function categoryWithSameName(int $tenantId, string $name): ?Category
    {
        return Category::query()
            ->where('tenant_id', $tenantId)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->first();
    }

    private function productWithSameName(int $tenantId, string $name): ?Product
    {
        return Product::query()
            ->where('tenant_id', $tenantId)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->first();
    }
}
