<?php

namespace Tests\Feature;

use App\Enums\StockMovementType;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockTransfer;
use App\Models\Tenant;
use App\Models\TenantBranchRelationship;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StockTransferWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_central_can_dispatch_and_branch_can_receive_mapped_product(): void
    {
        [$central, $centralOwner, $branch, $branchOwner, $source, $destination] = $this->networkProducts();

        $response = $this->actingAs($centralOwner)->post(route('tenant.stock-transfers.store'), [
            'destination_tenant_id' => $branch->id,
            'note' => 'Restock akhir pekan',
            'items' => [['product_id' => $source->id, 'quantity' => 4]],
        ]);

        $transfer = StockTransfer::firstOrFail();
        $response->assertRedirect(route('tenant.stock-transfers.show', $transfer));
        $this->assertSame(6, (int) $source->fresh()->stock);
        $this->assertSame(1, $transfer->items()->count());
        $this->assertDatabaseHas('stock_movements', [
            'tenant_id' => $central->id, 'type' => StockMovementType::TransferOut->value, 'quantity' => -4,
        ]);

        $this->actingAs($branchOwner)->post(route('tenant.stock-transfers.receive', $transfer))->assertSessionHasNoErrors();
        $this->assertSame('received', $transfer->fresh()->status);
        $this->assertSame(5, (int) $destination->fresh()->stock);
        $this->assertDatabaseHas('stock_movements', [
            'tenant_id' => $branch->id, 'type' => StockMovementType::TransferIn->value, 'quantity' => 4,
        ]);

        $this->actingAs($branchOwner)->post(route('tenant.stock-transfers.receive', $transfer))->assertSessionHasErrors('transfer');
        $this->assertSame(5, (int) $destination->fresh()->stock);
    }

    public function test_sender_can_cancel_in_transit_transfer_and_stock_is_returned(): void
    {
        [, $centralOwner, $branch, , $source] = $this->networkProducts();
        $this->actingAs($centralOwner)->post(route('tenant.stock-transfers.store'), [
            'destination_tenant_id' => $branch->id,
            'items' => [['product_id' => $source->id, 'quantity' => 3]],
        ]);
        $transfer = StockTransfer::firstOrFail();

        $this->actingAs($centralOwner)->post(route('tenant.stock-transfers.cancel', $transfer), ['reason' => 'Salah tujuan'])->assertSessionHasNoErrors();

        $this->assertSame('cancelled', $transfer->fresh()->status);
        $this->assertSame(10, (int) $source->fresh()->stock);
        $this->assertDatabaseHas('stock_movements', ['type' => StockMovementType::TransferReturn->value, 'quantity' => 3]);
    }

    public function test_recipient_can_reject_and_stock_returns_to_sender(): void
    {
        [, $centralOwner, $branch, $branchOwner, $source, $destination] = $this->networkProducts();
        $this->actingAs($centralOwner)->post(route('tenant.stock-transfers.store'), [
            'destination_tenant_id' => $branch->id,
            'items' => [['product_id' => $source->id, 'quantity' => 2]],
        ]);
        $transfer = StockTransfer::firstOrFail();

        $this->actingAs($branchOwner)->post(route('tenant.stock-transfers.reject', $transfer), ['reason' => 'Kemasan rusak'])->assertSessionHasNoErrors();

        $this->assertSame('rejected', $transfer->fresh()->status);
        $this->assertSame(10, (int) $source->fresh()->stock);
        $this->assertSame(1, (int) $destination->fresh()->stock);
    }

    public function test_transfer_rejects_insufficient_stock_unmapped_product_and_other_network(): void
    {
        [$central, $centralOwner, $branch, , $source] = $this->networkProducts();
        $other = Tenant::factory()->create(['tenant_type' => 'central', 'branch_network_code' => 'OTHER-NET']);

        $this->actingAs($centralOwner)->post(route('tenant.stock-transfers.store'), [
            'destination_tenant_id' => $branch->id,
            'items' => [['product_id' => $source->id, 'quantity' => 99]],
        ])->assertSessionHasErrors('items');
        $this->assertSame(10, (int) $source->fresh()->stock);

        $this->actingAs($centralOwner)->post(route('tenant.stock-transfers.store'), [
            'destination_tenant_id' => $other->id,
            'items' => [['product_id' => $source->id, 'quantity' => 1]],
        ])->assertSessionHasErrors('destination_tenant_id');
        $this->assertDatabaseCount('stock_transfers', 0);
        $this->assertSame($central->id, $source->tenant_id);
    }

    public function test_non_participant_cannot_view_or_process_transfer(): void
    {
        [, $centralOwner, $branch, , $source] = $this->networkProducts();
        $this->actingAs($centralOwner)->post(route('tenant.stock-transfers.store'), [
            'destination_tenant_id' => $branch->id,
            'items' => [['product_id' => $source->id, 'quantity' => 1]],
        ]);
        $transfer = StockTransfer::firstOrFail();
        $outsiderTenant = Tenant::factory()->create();
        $outsider = User::factory()->create(['tenant_id' => $outsiderTenant->id, 'role' => UserRole::Owner]);

        $this->actingAs($outsider)->get(route('tenant.stock-transfers.show', $transfer))->assertForbidden();
        $this->actingAs($outsider)->post(route('tenant.stock-transfers.receive', $transfer))->assertForbidden();
    }

    /** @return array{Tenant, User, Tenant, User, Product, Product} */
    private function networkProducts(): array
    {
        $central = Tenant::factory()->create(['tenant_type' => 'central', 'branch_network_code' => 'TRANSFER-NET']);
        $centralOwner = User::factory()->create(['tenant_id' => $central->id, 'role' => UserRole::Owner]);
        $branch = Tenant::factory()->create(['tenant_type' => 'branch']);
        $branchOwner = User::factory()->create(['tenant_id' => $branch->id, 'role' => UserRole::Owner]);
        TenantBranchRelationship::create([
            'parent_tenant_id' => $central->id, 'branch_tenant_id' => $branch->id,
            'network_code_used' => $central->branch_network_code, 'status' => 'active',
            'requested_at' => now()->subMonth(), 'parent_approved_at' => now()->subMonth(),
            'admin_approved_at' => now()->subMonth(), 'billing_effective_at' => now()->subDay(),
        ]);
        $centralCategory = Category::factory()->create(['tenant_id' => $central->id]);
        $branchCategory = Category::factory()->create(['tenant_id' => $branch->id, 'source_category_id' => $centralCategory->id]);
        $source = Product::factory()->create(['tenant_id' => $central->id, 'category_id' => $centralCategory->id, 'name' => 'Kopi Botol', 'stock' => 10, 'cost' => 5000]);
        $destination = Product::factory()->create(['tenant_id' => $branch->id, 'category_id' => $branchCategory->id, 'source_product_id' => $source->id, 'name' => 'Kopi Botol', 'stock' => 1, 'cost' => 4000]);

        return [$central, $centralOwner, $branch, $branchOwner, $source, $destination];
    }
}
