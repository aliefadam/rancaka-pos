<?php

namespace Tests\Feature;

use App\Enums\PaymentMethod;
use App\Enums\TransactionStatus;
use App\Enums\UserRole;
use App\Models\Shift;
use App\Models\CreditCustomer;
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
                ->where('sale.discount_total', 2000)
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
            ->assertJsonPath('sale.discount_total', 2000)
            ->assertJsonPath('sale.payment.method', 'cash')
            ->assertJsonPath('sale.items.0.name', 'Kopi Susu');
    }

    public function test_credit_receipt_shows_paid_and_remaining_amounts(): void
    {
        [$transaction, $cashier] = $this->transaction();
        $transaction->update([
            'payment_method' => PaymentMethod::Credit,
            'amount_received' => null,
            'change_amount' => null,
        ]);
        $customer = CreditCustomer::create([
            'tenant_id' => $transaction->tenant_id,
            'name' => 'Budi',
        ]);
        $transaction->creditSale()->create([
            'tenant_id' => $transaction->tenant_id,
            'credit_customer_id' => $customer->id,
            'total_amount' => 20700,
            'paid_amount' => 700,
            'status' => 'outstanding',
        ]);

        $this->actingAs($cashier)
            ->get(route('tenant.transactions.receipt', $transaction))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('sale.payment.method', 'credit')
                ->where('sale.payment.credit_customer', 'Budi')
                ->where('sale.payment.paid_amount', 700)
                ->where('sale.payment.remaining_amount', 20000));

        $signedUrl = URL::temporarySignedRoute(
            'bridge.receipts.show',
            now()->addMinutes(30),
            $transaction,
        );

        $this->getJson($signedUrl)
            ->assertOk()
            ->assertJsonPath('sale.payment.credit_customer', 'Budi')
            ->assertJsonPath('sale.payment.paid_amount', 700)
            ->assertJsonPath('sale.payment.remaining_amount', 20000);
    }

    public function test_recording_credit_payment_returns_with_link_to_reusable_payment_receipt(): void
    {
        [$transaction, $cashier] = $this->transaction();
        $transaction->update([
            'payment_method' => PaymentMethod::Credit,
            'amount_received' => null,
            'change_amount' => null,
        ]);
        $customer = CreditCustomer::create([
            'tenant_id' => $transaction->tenant_id,
            'name' => 'Siti',
        ]);
        $creditSale = $transaction->creditSale()->create([
            'tenant_id' => $transaction->tenant_id,
            'credit_customer_id' => $customer->id,
            'total_amount' => 20700,
            'paid_amount' => 0,
            'status' => 'outstanding',
        ]);

        $response = $this->actingAs($cashier)
            ->from(route('tenant.credit-sales.show', $creditSale))
            ->post(
            route('tenant.credit-sales.pay', $creditSale),
            ['amount' => 10000, 'note' => 'Cicilan pertama'],
        );
        $payment = $creditSale->payments()->sole();

        $response->assertRedirect(
            route('tenant.credit-sales.show', $creditSale),
        )
            ->assertSessionHas(
                'receipt_url',
                route('tenant.credit-payments.receipt', $payment),
            )
            ->assertSessionHas('credit_payment_amount', 10000)
            ->assertSessionHas('credit_payment_remaining', 10700);
        $this->actingAs($cashier)
            ->get(route('tenant.credit-payments.receipt', $payment))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tenant/Receipts/Show')
                ->where('sale.receipt_type', 'credit_payment')
                ->where('sale.customer', 'Siti')
                ->where('sale.payment_amount', 10000)
                ->where('sale.remaining_before', 20700)
                ->where('sale.remaining_after', 10700)
                ->where('sale.note', 'Cicilan pertama'));

        $signedUrl = URL::temporarySignedRoute(
            'bridge.credit-payments.show',
            now()->addMinutes(30),
            $payment,
        );
        $this->getJson($signedUrl)
            ->assertOk()
            ->assertJsonPath('sale.receipt_type', 'credit_payment')
            ->assertJsonPath('sale.payment_amount', 10000)
            ->assertJsonPath('sale.remaining_after', 10700);
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
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'discount_amount' => 2000,
            'tax_amount' => 1800,
            'service_charge_amount' => 900,
            'additional_fee' => 0,
            'total' => 20700,
            'amount_received' => 50000,
            'change_amount' => 29300,
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
