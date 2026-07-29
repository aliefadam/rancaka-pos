<?php

namespace Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Tenant>
 */
class TenantFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->company(),
            'email' => fake()->unique()->companyEmail(),
            'phone' => fake()->numerify('08##########'),
            'address' => fake()->address(),
            'status' => fake()->randomElement(['active', 'inactive']),
        ];
    }
}
