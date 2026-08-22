<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    public function configure(): static
    {
        return $this->afterCreating(function (Product $product) {
            if (! $product->priceOptions()->exists()) {
                $product->priceOptions()->create([
                    'name' => 'Harga utama',
                    'price' => $product->price,
                    'is_default' => true,
                    'is_active' => true,
                    'sort_order' => 0,
                ]);
            }
        });
    }

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true),
            'price' => fake()->numberBetween(5000, 50000),
            'cost' => 0,
            'margin_percentage' => 0,
            'track_stock' => true,
            'stock' => fake()->numberBetween(0, 50),
            'is_active' => true,
        ];
    }
}
