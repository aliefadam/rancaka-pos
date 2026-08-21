<?php

namespace Database\Factories;

use App\Enums\DevelopmentTicketPriority;
use App\Enums\DevelopmentTicketStatus;
use App\Enums\DevelopmentTicketType;
use App\Models\DevelopmentTicket;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<DevelopmentTicket> */
class DevelopmentTicketFactory extends Factory
{
    protected $model = DevelopmentTicket::class;

    public function definition(): array
    {
        return [
            'title' => fake()->sentence(5),
            'type' => DevelopmentTicketType::Feature,
            'priority' => DevelopmentTicketPriority::Normal,
            'status' => DevelopmentTicketStatus::Pending,
            'description' => ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => fake()->sentence()]]]]],
            'created_by' => User::factory(),
        ];
    }
}
