<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_product_catalog_is_seeded_with_current_and_sachet_products(): void
    {
        $this->seed();

        $this->assertSame(20, Product::query()->count());
        $this->assertDatabaseHas('products', [
            'name' => 'Es Kopi Susu Gula Aren',
            'price' => 18000,
        ]);
        $this->assertDatabaseHas('products', [
            'name' => 'Pop Ice Cokelat (Sachet)',
            'track_stock' => true,
        ]);
        $this->assertDatabaseHas('products', [
            'name' => 'NutriSari Jeruk Peras (Sachet)',
            'track_stock' => true,
        ]);
        $this->assertDatabaseMissing('products', [
            'name' => 'Americano HOT',
        ]);
        $this->assertDatabaseMissing('products', [
            'name' => 'Aoka Coklat',
        ]);
    }
}
