<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\SupplierPayableNotification;
use App\Services\SupplierPayableReminderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class SupplierPayableReminderTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_reminds_the_owner_for_the_next_installment_due_tomorrow(): void
    {
        Notification::fake();

        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $supplier = Supplier::create([
            'tenant_id' => $tenant->id,
            'name' => 'Supplier Besok',
        ]);

        $purchase = $this->purchase($tenant->id, $supplier->id, 'PUR-BESOK', today()->addMonth());
        $purchase->installments()->createMany([
            [
                'tenant_id' => $tenant->id,
                'sequence' => 1,
                'due_date' => today()->addDay(),
                'planned_amount' => 40000,
            ],
            [
                'tenant_id' => $tenant->id,
                'sequence' => 2,
                'due_date' => today()->addMonth(),
                'planned_amount' => 60000,
            ],
        ]);

        $sent = app(SupplierPayableReminderService::class)->send();

        $this->assertSame(1, $sent);
        Notification::assertSentTo(
            $owner,
            SupplierPayableNotification::class,
            fn (SupplierPayableNotification $notification) =>
                $notification->toArray($owner)['title'] === 'Hutang supplier jatuh tempo besok'
                && $notification->toArray($owner)['purchase_id'] === $purchase->id,
        );
    }

    public function test_it_does_not_remind_before_the_day_prior_to_the_due_date(): void
    {
        Notification::fake();

        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $supplier = Supplier::create([
            'tenant_id' => $tenant->id,
            'name' => 'Supplier Nanti',
        ]);
        $purchase = $this->purchase($tenant->id, $supplier->id, 'PUR-NANTI', today()->addDays(2));
        $purchase->installments()->create([
            'tenant_id' => $tenant->id,
            'sequence' => 1,
            'due_date' => today()->addDays(2),
            'planned_amount' => 100000,
        ]);

        $this->assertSame(0, app(SupplierPayableReminderService::class)->send());
        Notification::assertNothingSentTo($owner);
    }

    private function purchase(int $tenantId, int $supplierId, string $number, mixed $dueDate): Purchase
    {
        return Purchase::create([
            'tenant_id' => $tenantId,
            'supplier_id' => $supplierId,
            'number' => $number,
            'purchase_date' => today(),
            'payment_term' => 'installment',
            'due_date' => $dueDate,
            'items_subtotal' => 100000,
            'total_amount' => 100000,
            'balance_amount' => 100000,
            'payment_status' => 'unpaid',
        ]);
    }
}
