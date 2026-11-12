<?php

namespace Tests\Feature;

use App\Enums\TransactionStatus;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OptionalCashierSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_cashier_can_open_pos_and_complete_sale_without_starting_session(): void
    {
        [$owner, $product] = $this->storeContext();
        $priceOption = $product->priceOptions()->where('is_default', true)->firstOrFail();

        $this->actingAs($owner)
            ->get(route('tenant.pos.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('activeShift', null)
                ->where('shiftSummary', null)
                ->has('products', 1));

        $this->actingAs($owner)
            ->post(route('tenant.pos.checkout'), $this->payload($product, $priceOption->id))
            ->assertRedirect(route('tenant.pos.index'))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('transactions', [
            'tenant_id' => $owner->tenant_id,
            'shift_id' => null,
            'status' => TransactionStatus::Completed->value,
            'total' => 15_000,
        ]);
        $this->assertSame(4, $product->fresh()->stock);
    }

    public function test_held_transactions_remain_available_without_session(): void
    {
        [$owner, $product] = $this->storeContext();
        $priceOption = $product->priceOptions()->where('is_default', true)->firstOrFail();

        $this->actingAs($owner)
            ->post(route('tenant.pos.hold'), $this->payload($product, $priceOption->id))
            ->assertRedirect(route('tenant.pos.index'));

        $this->assertDatabaseHas('transactions', [
            'tenant_id' => $owner->tenant_id,
            'shift_id' => null,
            'status' => TransactionStatus::Held->value,
        ]);

        $this->actingAs($owner)
            ->get(route('tenant.pos.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('activeShift', null)
                ->where('heldTransactionCount', 1)
                ->has('heldTransactions', 1));
    }

    public function test_credit_initial_payment_can_be_recorded_without_session(): void
    {
        [$owner, $product] = $this->storeContext();
        $priceOption = $product->priceOptions()->where('is_default', true)->firstOrFail();
        $payload = $this->payload($product, $priceOption->id);
        $payload['payment_method'] = 'credit';
        $payload['amount_received'] = null;
        $payload['credit_customer_name'] = 'Pelanggan Bon';
        $payload['credit_initial_payment'] = 5_000;

        $this->actingAs($owner)
            ->post(route('tenant.pos.checkout'), $payload)
            ->assertRedirect(route('tenant.pos.index'))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('credit_payments', [
            'tenant_id' => $owner->tenant_id,
            'shift_id' => null,
            'amount' => 5_000,
            'note' => 'Pembayaran awal saat transaksi',
        ]);
    }

    /** @return array{User, Product} */
    private function storeContext(): array
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $category = Category::factory()->create(['tenant_id' => $tenant->id]);
        $product = Product::factory()->create([
            'tenant_id' => $tenant->id,
            'category_id' => $category->id,
            'price' => 15_000,
            'stock' => 5,
        ]);

        return [$owner, $product];
    }

    /** @return array<string, mixed> */
    private function payload(Product $product, int $priceOptionId): array
    {
        return [
            'items' => [[
                'product_id' => $product->id,
                'price_option_id' => $priceOptionId,
                'quantity' => 1,
            ]],
            'payment_method' => 'cash',
            'additional_fee' => 0,
            'amount_received' => 20_000,
        ];
    }
}
