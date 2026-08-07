<?php

namespace Tests\Feature;

use App\Enums\PaymentMethod;
use App\Enums\TransactionStatus;
use App\Enums\UserRole;
use App\Models\Shift;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReceiptPrintingTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_user_can_open_own_transaction_receipt(): void
    {
        [$transaction, $cashier] = $this->transaction();

        $this->actingAs($cashier)
            ->get(route('tenant.transactions.receipt', $transaction))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tenant/Receipts/Show')
                ->where('sale.invoice_number', 'TRX-PRINT-001')
                ->where('store.receipt_size', '80mm')
                ->where('sale.items.0.product_name', 'Kopi Susu'));
    }

    public function test_tenant_user_cannot_open_another_tenants_receipt(): void
    {
        [$transaction] = $this->transaction();
        $otherTenant = Tenant::factory()->create();
        $otherOwner = User::factory()->create([
            'tenant_id' => $otherTenant->id,
            'role' => UserRole::Owner,
        ]);

        $this->actingAs($otherOwner)
            ->get(route('tenant.transactions.receipt', $transaction))
            ->assertForbidden();
    }

    public function test_print_bridge_only_accepts_signed_urls_and_returns_receipt_json(): void
    {
        [$transaction] = $this->transaction();

        $this->get(route('bridge.receipts.show', $transaction))
            ->assertForbidden();

        $signedUrl = URL::temporarySignedRoute(
            'bridge.receipts.show',
            now()->addMinutes(30),
            $transaction,
        );

        $this->getJson($signedUrl)
            ->assertOk()
            ->assertJsonPath('store.name', 'Kedai Rancaka')
            ->assertJsonPath('store.receipt_size', '80mm')
            ->assertJsonPath('sale.invoice_number', 'TRX-PRINT-001')
            ->assertJsonPath('sale.payment.method', 'cash')
            ->assertJsonPath('sale.items.0.name', 'Kopi Susu');
    }

    /** @return array{Transaction, User} */
    private function transaction(): array
    {
        $tenant = Tenant::factory()->create([
            'name' => 'Kedai Rancaka',
            'receipt_size' => '80mm',
            'auto_print_receipt' => true,
        ]);
        $cashier = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $shift = Shift::create([
            'tenant_id' => $tenant->id,
            'user_id' => $cashier->id,
            'opening_cash' => 100000,
            'opened_at' => now(),
        ]);
        $transaction = Transaction::create([
            'tenant_id' => $tenant->id,
            'shift_id' => $shift->id,
            'user_id' => $cashier->id,
            'invoice_number' => 'TRX-PRINT-001',
            'status' => TransactionStatus::Completed,
            'payment_method' => PaymentMethod::Cash,
            'subtotal' => 20000,
            'tax_amount' => 2000,
            'service_charge_amount' => 1000,
            'additional_fee' => 0,
            'total' => 23000,
            'amount_received' => 50000,
            'change_amount' => 27000,
        ]);
        $transaction->items()->create([
            'product_name' => 'Kopi Susu',
            'unit_price' => 10000,
            'quantity' => 2,
            'subtotal' => 20000,
        ]);

        return [$transaction, $cashier];
    }
}
