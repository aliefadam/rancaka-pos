<?php

namespace App\Http\Controllers\Tenant;

use App\Enums\TransactionStatus;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\Transaction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OnboardingSampleDataController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $tenant = $request->user()->tenant;

        if ($tenant->products()->exists()) {
            return back()->with('error', 'Data contoh hanya dapat diisi saat toko belum mempunyai produk.');
        }

        if (Transaction::query()->where('tenant_id', $tenant->id)->where('status', TransactionStatus::Completed)->exists()) {
            return back()->with('error', 'Data contoh tidak dapat diisi setelah toko mempunyai transaksi.');
        }

        DB::transaction(function () use ($tenant): void {
            $categoryName = $tenant->categories()->where('name', 'Produk Contoh')->exists()
                ? 'Produk Contoh Rancaka'
                : 'Produk Contoh';

            $category = $tenant->categories()->create([
                'name' => $categoryName,
                'icon' => 'fi-rr-shopping-bag',
                'is_active' => true,
                'is_onboarding_sample' => true,
            ]);

            foreach ($this->products() as $item) {
                $product = $tenant->products()->create([
                    ...$item,
                    'category_id' => $category->id,
                    'track_stock' => true,
                    'is_active' => true,
                    'is_onboarding_sample' => true,
                ]);
                $product->priceOptions()->create([
                    'name' => 'Harga utama',
                    'price' => $product->price,
                    'is_default' => true,
                    'is_active' => true,
                    'sort_order' => 0,
                ]);
            }
        });

        return back()->with('success', 'Lima produk contoh berhasil ditambahkan. Anda dapat mengubah atau menghapusnya kapan saja.');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $tenant = $request->user()->tenant;

        DB::transaction(function () use ($tenant): void {
            $products = Product::query()
                ->where('tenant_id', $tenant->id)
                ->where('is_onboarding_sample', true)
                ->get();

            foreach ($products as $product) {
                $product->stockMovements()->delete();
                $product->delete();
            }

            Category::query()
                ->where('tenant_id', $tenant->id)
                ->where('is_onboarding_sample', true)
                ->doesntHave('products')
                ->delete();
        });

        return back()->with('success', 'Data contoh berhasil dihapus. Riwayat transaksi yang pernah memakai produk contoh tetap tersimpan.');
    }

    /** @return array<int, array{name: string, price: int, cost: int, margin_percentage: float, stock: int}> */
    private function products(): array
    {
        return [
            ['name' => 'Air Mineral', 'price' => 5000, 'cost' => 3000, 'margin_percentage' => 66.67, 'stock' => 20],
            ['name' => 'Kopi Susu', 'price' => 12000, 'cost' => 6000, 'margin_percentage' => 100, 'stock' => 15],
            ['name' => 'Mi Instan', 'price' => 8000, 'cost' => 4500, 'margin_percentage' => 77.78, 'stock' => 20],
            ['name' => 'Nasi Goreng', 'price' => 18000, 'cost' => 10000, 'margin_percentage' => 80, 'stock' => 10],
            ['name' => 'Jus Jeruk', 'price' => 10000, 'cost' => 5000, 'margin_percentage' => 100, 'stock' => 12],
        ];
    }
}
