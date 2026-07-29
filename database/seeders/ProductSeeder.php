<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::query()
            ->where('name', 'Kedai Josjis')
            ->firstOrFail();

        $categories = Category::query()
            ->where('tenant_id', $tenant->id)
            ->get()
            ->keyBy('name');

        Product::factory()->createMany([
            // Minuman kekinian
            ['tenant_id' => $tenant->id, 'category_id' => $categories['Minuman']->id, 'name' => 'Es Kopi Susu Gula Aren', 'price' => 18000, 'track_stock' => false, 'stock' => 0],
            ['tenant_id' => $tenant->id, 'category_id' => $categories['Minuman']->id, 'name' => 'Matcha Latte', 'price' => 15000, 'track_stock' => false, 'stock' => 0],
            ['tenant_id' => $tenant->id, 'category_id' => $categories['Minuman']->id, 'name' => 'Red Velvet Latte', 'price' => 15000, 'track_stock' => false, 'stock' => 0],
            ['tenant_id' => $tenant->id, 'category_id' => $categories['Minuman']->id, 'name' => 'Chocolate Hazelnut', 'price' => 16000, 'track_stock' => false, 'stock' => 0],
            ['tenant_id' => $tenant->id, 'category_id' => $categories['Minuman']->id, 'name' => 'Thai Tea Creamy', 'price' => 12000, 'track_stock' => false, 'stock' => 0],

            // Minuman kemasan sachet
            ['tenant_id' => $tenant->id, 'category_id' => $categories['Minuman']->id, 'name' => 'Pop Ice Cokelat (Sachet)', 'price' => 3000, 'track_stock' => true, 'stock' => 40],
            ['tenant_id' => $tenant->id, 'category_id' => $categories['Minuman']->id, 'name' => 'Pop Ice Taro (Sachet)', 'price' => 3000, 'track_stock' => true, 'stock' => 32],
            ['tenant_id' => $tenant->id, 'category_id' => $categories['Minuman']->id, 'name' => 'Pop Ice Permen Karet (Sachet)', 'price' => 3000, 'track_stock' => true, 'stock' => 28],
            ['tenant_id' => $tenant->id, 'category_id' => $categories['Minuman']->id, 'name' => 'NutriSari Jeruk Peras (Sachet)', 'price' => 3000, 'track_stock' => true, 'stock' => 45],
            ['tenant_id' => $tenant->id, 'category_id' => $categories['Minuman']->id, 'name' => 'NutriSari Sweet Orange (Sachet)', 'price' => 3000, 'track_stock' => true, 'stock' => 36],
            ['tenant_id' => $tenant->id, 'category_id' => $categories['Minuman']->id, 'name' => 'NutriSari Milky Orange (Sachet)', 'price' => 3500, 'track_stock' => true, 'stock' => 24],
            ['tenant_id' => $tenant->id, 'category_id' => $categories['Minuman']->id, 'name' => 'Good Day Freeze Mocafrio (Sachet)', 'price' => 3500, 'track_stock' => true, 'stock' => 30],

            // Makanan
            ['tenant_id' => $tenant->id, 'category_id' => $categories['Makanan']->id, 'name' => 'Rice Bowl Chicken Teriyaki', 'price' => 22000, 'track_stock' => false, 'stock' => 0],
            ['tenant_id' => $tenant->id, 'category_id' => $categories['Makanan']->id, 'name' => 'Rice Bowl Ayam Sambal Matah', 'price' => 22000, 'track_stock' => false, 'stock' => 0],
            ['tenant_id' => $tenant->id, 'category_id' => $categories['Makanan']->id, 'name' => 'Mie Nyemek Level Up', 'price' => 15000, 'track_stock' => false, 'stock' => 0],
            ['tenant_id' => $tenant->id, 'category_id' => $categories['Makanan']->id, 'name' => 'Dimsum Mentai', 'price' => 18000, 'track_stock' => false, 'stock' => 0],

            // Snack
            ['tenant_id' => $tenant->id, 'category_id' => $categories['Snack']->id, 'name' => 'Kentang Goreng Bumbu Balado', 'price' => 12000, 'track_stock' => false, 'stock' => 0],
            ['tenant_id' => $tenant->id, 'category_id' => $categories['Snack']->id, 'name' => 'Cireng Ayam Suwir', 'price' => 13000, 'track_stock' => false, 'stock' => 0],
            ['tenant_id' => $tenant->id, 'category_id' => $categories['Snack']->id, 'name' => 'Basreng Daun Jeruk', 'price' => 10000, 'track_stock' => true, 'stock' => 20],
            ['tenant_id' => $tenant->id, 'category_id' => $categories['Snack']->id, 'name' => 'Makaroni Pedas Jeruk Purut', 'price' => 8000, 'track_stock' => true, 'stock' => 18],
        ]);
    }
}
