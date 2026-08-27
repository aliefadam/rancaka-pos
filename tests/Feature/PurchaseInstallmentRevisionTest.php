<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\User;
use App\Services\PurchaseService;
use App\Services\SupplierPaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PurchaseInstallmentRevisionTest extends TestCase
{
    use RefreshDatabase;

    public function test_posted_schedule_can_be_revised_without_changing_paid_amount_and_is_audited(): void
    {
        [$owner, $purchase] = $this->installmentPurchase();
        $first = $purchase->installments()->first();
        app(SupplierPaymentService::class)->record($owner, $purchase, [
            'amount' => 8000,
            'payment_date' => today()->toDateString(),
            'payment_method' => 'cash',
            'installment_id' => $first->id,
        ]);
        $second = $purchase->installments()->whereKeyNot($first->id)->first();

        $response = $this->actingAs($owner)->put(route('tenant.purchases.installments.update', $purchase), [
            'reason' => 'Supplier menyetujui perubahan tanggal dan pembagian termin.',
            'installments' => [
                ['id' => $first->id, 'due_date' => today()->addDays(10)->toDateString(), 'planned_amount' => 15000],
                ['due_date' => today()->addDays(45)->toDateString(), 'planned_amount' => 25000],
            ],
        ]);

        $response->assertRedirect()->assertSessionHasNoErrors();
        $this->assertDatabaseMissing('purchase_installments', ['id' => $second->id]);
        $this->assertDatabaseHas('purchase_installments', [
            'id' => $first->id,
            'sequence' => 1,
            'planned_amount' => 15000,
            'paid_amount' => 8000,
            'status' => 'partial',
        ]);
        $this->assertSame(40000, (int) $purchase->installments()->sum('planned_amount'));
        $this->assertSame(today()->addDays(45)->toDateString(), $purchase->fresh()->due_date->toDateString());

        $history = $purchase->installmentScheduleHistories()->firstOrFail();
        $this->assertSame($owner->id, $history->changed_by);
        $this->assertSame('Supplier menyetujui perubahan tanggal dan pembagian termin.', $history->reason);
        $this->assertCount(2, $history->before_schedule);
        $this->assertCount(2, $history->after_schedule);
        $this->assertSame(8000, $history->after_schedule[0]['paid_amount']);
    }

    public function test_paid_installment_cannot_be_removed_or_reduced_below_paid_amount(): void
    {
        [$owner, $purchase] = $this->installmentPurchase();
        $installments = $purchase->installments()->get();
        app(SupplierPaymentService::class)->record($owner, $purchase, [
            'amount' => 12000,
            'payment_date' => today()->toDateString(),
            'payment_method' => 'cash',
            'installment_id' => $installments[0]->id,
        ]);

        $this->actingAs($owner)->put(route('tenant.purchases.installments.update', $purchase), [
            'reason' => 'Mencoba menghapus termin terbayar.',
            'installments' => [
                ['id' => $installments[1]->id, 'due_date' => $installments[1]->due_date->toDateString(), 'planned_amount' => 40000],
            ],
        ])->assertSessionHasErrors('installments');

        $this->actingAs($owner)->put(route('tenant.purchases.installments.update', $purchase), [
            'reason' => 'Mencoba menurunkan termin terbayar.',
            'installments' => [
                ['id' => $installments[0]->id, 'due_date' => $installments[0]->due_date->toDateString(), 'planned_amount' => 10000],
                ['id' => $installments[1]->id, 'due_date' => $installments[1]->due_date->toDateString(), 'planned_amount' => 30000],
            ],
        ])->assertSessionHasErrors('installments.0.planned_amount');

        $this->assertSame(12000, (int) $installments[0]->fresh()->paid_amount);
        $this->assertDatabaseCount('purchase_installment_schedule_histories', 0);
    }

    public function test_void_payment_restores_installment_allocations_and_purchase_balance_consistently(): void
    {
        [$owner, $purchase] = $this->installmentPurchase();
        $payment = app(SupplierPaymentService::class)->record($owner, $purchase, [
            'amount' => 25000,
            'payment_date' => today()->toDateString(),
            'payment_method' => 'cash',
        ]);

        $this->assertSame(35000, (int) $purchase->fresh()->paid_amount);
        $this->assertSame([20000, 5000], $purchase->installments()->pluck('paid_amount')->map(fn ($value) => (int) $value)->all());
        $allocationCount = $payment->allocations()->count();

        app(SupplierPaymentService::class)->void($owner, $payment, 'Pembayaran salah dicatat.');

        $purchase->refresh();
        $this->assertSame(10000, (int) $purchase->paid_amount);
        $this->assertSame(40000, (int) $purchase->balance_amount);
        $this->assertSame([0, 0], $purchase->installments()->pluck('paid_amount')->map(fn ($value) => (int) $value)->all());
        $this->assertSame(['scheduled', 'scheduled'], $purchase->installments()->pluck('status')->all());
        $this->assertSame($allocationCount, $payment->allocations()->count(), 'Alokasi dipertahankan sebagai jejak audit, tetapi tidak lagi dihitung.');
    }

    public function test_internal_supplier_payment_receipt_is_printable_and_tenant_scoped(): void
    {
        [$owner, $purchase] = $this->installmentPurchase();
        $payment = app(SupplierPaymentService::class)->record($owner, $purchase, [
            'amount' => 5000,
            'payment_date' => today()->toDateString(),
            'payment_method' => 'cash',
            'note' => 'Pembayaran loket.',
        ]);

        $this->actingAs($owner)->get(route('tenant.supplier-payments.receipt', $payment))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tenant/SupplierPayments/Receipt')
                ->where('payment.number', $payment->number)
                ->where('payment.amount', 5000)
                ->where('payment.status', 'valid')
                ->where('payment.remaining_before', 40000)
                ->where('payment.remaining_after', 35000)
                ->where('purchase.number', $purchase->number)
                ->where('supplier.name', $purchase->supplier->name)
                ->has('payment.allocations', 1));

        $otherTenant = Tenant::factory()->create();
        $otherOwner = User::factory()->create(['tenant_id' => $otherTenant->id, 'role' => UserRole::Owner]);
        $this->actingAs($otherOwner)->get(route('tenant.supplier-payments.receipt', $payment))->assertForbidden();
    }

    /** @return array{User, Purchase} */
    private function installmentPurchase(): array
    {
        $tenant = Tenant::factory()->create(['name' => 'Toko Uji']);
        $owner = User::factory()->create(['tenant_id' => $tenant->id, 'role' => UserRole::Owner]);
        $category = Category::factory()->create(['tenant_id' => $tenant->id]);
        $product = Product::factory()->create([
            'tenant_id' => $tenant->id,
            'category_id' => $category->id,
            'stock' => 0,
            'cost' => 0,
        ]);
        $supplier = Supplier::create(['tenant_id' => $tenant->id, 'name' => 'Supplier Uji', 'is_active' => true]);
        $purchase = app(PurchaseService::class)->create($owner, [
            'supplier_id' => $supplier->id,
            'purchase_date' => today()->toDateString(),
            'payment_term' => 'installment',
            'due_date' => today()->addMonth()->toDateString(),
            'initial_payment_amount' => 10000,
            'initial_payment_method' => 'cash',
            'items' => [['item_type' => 'product', 'item_id' => $product->id, 'quantity' => 10, 'unit_cost' => 5000]],
            'installments' => [
                ['due_date' => today()->addWeeks(2)->toDateString(), 'amount' => 20000],
                ['due_date' => today()->addMonth()->toDateString(), 'amount' => 20000],
            ],
        ]);

        return [$owner, $purchase->fresh(['supplier', 'installments'])];
    }
}
