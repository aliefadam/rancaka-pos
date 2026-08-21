<?php

namespace Tests\Feature;

use App\Enums\PaymentMethod;
use App\Enums\TransactionStatus;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\Role;
use App\Models\Shift;
use App\Models\StockMovement;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TransactionVoidTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_can_void_within_24_hours_and_note_uses_transaction_cashier(): void
    {
        [$transaction, $product, $rawMaterial, $cashier] = $this->sale(now()->subHours(23));
        $voider = $this->employeeWithVoidPermission($transaction->tenant);

        $this->actingAs($voider)
            ->patch(route('tenant.reports.transactions.void', $transaction), $this->voidPayload())
            ->assertRedirect(route('tenant.reports.transactions.index'));

        $this->assertSame(TransactionStatus::Voided, $transaction->fresh()->status);
        $this->assertSame($voider->id, $transaction->fresh()->voided_by);
        $this->assertSame('Salah input kasir', $transaction->fresh()->void_reason);
        $this->assertNotNull($transaction->fresh()->voided_at);
        $this->assertSame(7, $product->fresh()->stock);
        $this->assertSame('13.00', $rawMaterial->fresh()->stock);

        $movements = StockMovement::query()->latest()->take(2)->get();
        $this->assertCount(2, $movements);
        $movements->each(function (StockMovement $movement) use ($cashier, $voider) {
            $this->assertStringContainsString("Kasir: {$cashier->name}", $movement->note);
            $this->assertSame($voider->id, $movement->user_id);
        });
    }

    public function test_employee_cannot_void_after_24_hours(): void
    {
        [$transaction, $product, $rawMaterial] = $this->sale(now()->subDay()->subSecond());
        $employee = $this->employeeWithVoidPermission($transaction->tenant);

        $this->actingAs($employee)
            ->patch(route('tenant.reports.transactions.void', $transaction), $this->voidPayload())
            ->assertSessionHasErrors('transactions');

        $this->assertSame(TransactionStatus::Completed, $transaction->fresh()->status);
        $this->assertSame(5, $product->fresh()->stock);
        $this->assertSame('10.00', $rawMaterial->fresh()->stock);
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_owner_can_void_after_24_hours(): void
    {
        [$transaction] = $this->sale(now()->subDays(10));
        $owner = User::factory()->create([
            'tenant_id' => $transaction->tenant_id,
            'role' => UserRole::Owner,
        ]);

        $this->actingAs($owner)
            ->patch(route('tenant.reports.transactions.void', $transaction), $this->voidPayload())
            ->assertRedirect(route('tenant.reports.transactions.index'));

        $this->assertSame(TransactionStatus::Voided, $transaction->fresh()->status);
    }

    public function test_history_exposes_void_availability_based_on_role_and_age(): void
    {
        [$transaction] = $this->sale(now()->subDays(2));
        $employee = $this->employeeWithVoidPermission($transaction->tenant);
        $owner = User::factory()->create([
            'tenant_id' => $transaction->tenant_id,
            'role' => UserRole::Owner,
        ]);

        $this->actingAs($employee)
            ->get(route('tenant.reports.transactions.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('transactions.data.0.can_be_voided', false));

        $this->actingAs($owner)
            ->get(route('tenant.reports.transactions.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('transactions.data.0.can_be_voided', true));
    }

    public function test_bulk_void_is_atomic_and_requires_the_current_password(): void
    {
        [$first, $firstProduct] = $this->sale(now()->subHours(2));
        [$second, $secondProduct] = $this->sale(now()->subHours(3));
        $owner = User::factory()->create([
            'tenant_id' => $first->tenant_id,
            'role' => UserRole::Owner,
        ]);
        $second->update(['tenant_id' => $first->tenant_id]);

        $this->actingAs($owner)->patch(route('tenant.reports.transactions.bulk-void'), [
            'ids' => [$first->id, $second->id],
            'password' => 'password-salah',
            'reason' => 'Data latihan',
        ])->assertSessionHasErrors('password');

        $this->assertSame(TransactionStatus::Completed, $first->fresh()->status);
        $this->assertSame(TransactionStatus::Completed, $second->fresh()->status);

        $this->actingAs($owner)->patch(route('tenant.reports.transactions.bulk-void'), [
            'ids' => [$first->id, $second->id],
            'password' => 'password',
            'reason' => 'Data latihan',
        ])->assertRedirect();

        $this->assertSame(TransactionStatus::Voided, $first->fresh()->status);
        $this->assertSame(TransactionStatus::Voided, $second->fresh()->status);
        $this->assertSame(7, $firstProduct->fresh()->stock);
        $this->assertSame(7, $secondProduct->fresh()->stock);
    }

    public function test_bulk_void_rejects_cross_tenant_selection_without_partial_changes(): void
    {
        [$ownTransaction, $ownProduct] = $this->sale(now()->subHour());
        [$otherTransaction, $otherProduct] = $this->sale(now()->subHour());
        $owner = User::factory()->create([
            'tenant_id' => $ownTransaction->tenant_id,
            'role' => UserRole::Owner,
        ]);

        $this->actingAs($owner)->patch(route('tenant.reports.transactions.bulk-void'), [
            'ids' => [$ownTransaction->id, $otherTransaction->id],
            'password' => 'password',
            'reason' => 'Data latihan',
        ])->assertSessionHasErrors('transactions');

        $this->assertSame(TransactionStatus::Completed, $ownTransaction->fresh()->status);
        $this->assertSame(TransactionStatus::Completed, $otherTransaction->fresh()->status);
        $this->assertSame(5, $ownProduct->fresh()->stock);
        $this->assertSame(5, $otherProduct->fresh()->stock);
    }

    /**
     * @return array{Transaction, Product, RawMaterial, User}
     */
    private function sale(\DateTimeInterface $createdAt): array
    {
        $tenant = Tenant::factory()->create();
        $cashier = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Employee,
        ]);
        $shift = Shift::create([
            'tenant_id' => $tenant->id,
            'user_id' => $cashier->id,
            'opening_cash' => 100000,
            'opened_at' => $createdAt,
        ]);
        $category = Category::create([
            'tenant_id' => $tenant->id,
            'name' => 'Minuman',
            'icon' => 'cup',
            'is_active' => true,
        ]);
        $product = Product::create([
            'tenant_id' => $tenant->id,
            'category_id' => $category->id,
            'name' => 'Kopi Susu',
            'price' => 15000,
            'track_stock' => true,
            'stock' => 5,
            'is_active' => true,
        ]);
        $rawMaterial = RawMaterial::create([
            'tenant_id' => $tenant->id,
            'name' => 'Susu',
            'unit' => 'liter',
            'stock' => 10,
            'is_active' => true,
        ]);
        $product->rawMaterials()->attach($rawMaterial->id, ['quantity' => 1.5]);

        $transaction = Transaction::create([
            'tenant_id' => $tenant->id,
            'shift_id' => $shift->id,
            'user_id' => $cashier->id,
            'invoice_number' => 'TRX-VOID-TEST',
            'status' => TransactionStatus::Completed,
            'payment_method' => PaymentMethod::Cash,
            'subtotal' => 30000,
            'additional_fee' => 0,
            'total' => 30000,
            'amount_received' => 50000,
            'change_amount' => 20000,
        ]);
        $transaction->forceFill([
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ])->saveQuietly();
        $transaction->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'unit_price' => $product->price,
            'quantity' => 2,
            'subtotal' => 30000,
        ]);

        return [$transaction, $product, $rawMaterial, $cashier];
    }

    private function employeeWithVoidPermission(Tenant $tenant): User
    {
        $role = Role::create([
            'tenant_id' => $tenant->id,
            'name' => 'Supervisor',
            'permissions' => ['transactions.view', 'transactions.delete'],
        ]);

        return User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Employee,
            'employee_role_id' => $role->id,
        ]);
    }

    private function voidPayload(): array
    {
        return [
            'password' => 'password',
            'reason' => 'Salah input kasir',
        ];
    }
}
