<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\SalesProfile;
use App\Models\SubscriptionPayment;
use App\Models\Tenant;
use App\Models\TenantBranchRelationship;
use App\Models\TenantImpersonationLog;
use App\Models\User;
use App\Services\BranchNetworkService;
use App\Services\ConsolidatedBillingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class BranchNetworkE2ETest extends TestCase
{
    use RefreshDatabase;

    public function test_new_branch_requires_double_approval_and_trial_starts_only_after_admin_approval(): void
    {
        [$central, $centralOwner] = $this->central();

        $this->post(route('register'), [
            'store_name' => 'Cabang Selatan', 'owner_name' => 'Owner Cabang',
            'email' => 'selatan@example.com', 'phone' => '081234567800',
            'username' => 'cabang.selatan', 'password' => 'password123',
            'password_confirmation' => 'password123', 'account_type' => 'branch',
            'network_code' => $central->branch_network_code,
        ])->assertRedirect(route('tenant.billing.index'));

        $branch = Tenant::where('email', 'selatan@example.com')->firstOrFail();
        $relationship = $branch->currentBranchRelationship;
        $this->assertSame('pending_parent_approval', $relationship->status);
        $this->assertSame('pending_network', $branch->subscription->status);
        $this->assertDatabaseMissing('billing_invoices', ['tenant_id' => $branch->id]);

        $this->actingAs($centralOwner)->patch(route('tenant.network.decision', $relationship), ['decision' => 'approve'])->assertSessionHasNoErrors();
        $this->assertSame('pending_admin_approval', $relationship->fresh()->status);
        $this->assertNull($relationship->fresh()->trial_starts_at);

        $admin = User::factory()->create(['role' => UserRole::Superadmin]);
        $this->actingAs($admin)->patch(route('admin.networks.decision', $relationship), ['decision' => 'approve'])->assertSessionHasNoErrors();

        $relationship->refresh();
        $this->assertSame('approved_pending_billing', $relationship->status);
        $this->assertTrue($relationship->trial_ends_at->equalTo($relationship->trial_starts_at->copy()->addDays(7)));
        $this->assertSame('trialing', $branch->subscription->fresh()->status);
        $this->assertDatabaseCount('tenant_branch_status_histories', 3);
        $this->assertDatabaseHas('notifications', ['notifiable_id' => $centralOwner->id]);
    }

    public function test_invalid_network_code_and_sales_referral_are_rejected_for_branch(): void
    {
        $sales = SalesProfile::create(['name' => 'Sales', 'referral_code' => 'SALES01', 'commission_rate' => 10, 'status' => 'active']);
        $payload = [
            'store_name' => 'Cabang Invalid', 'owner_name' => 'Owner', 'email' => 'invalid@example.com',
            'phone' => '0812', 'username' => 'invalid.branch', 'password' => 'password123',
            'password_confirmation' => 'password123', 'account_type' => 'branch',
            'network_code' => 'TIDAKADA', 'referral_code' => $sales->referral_code,
        ];
        $this->post(route('register'), $payload)->assertSessionHasErrors(['network_code', 'referral_code']);
        $this->assertDatabaseMissing('tenants', ['email' => 'invalid@example.com']);
    }

    public function test_consolidated_invoice_has_snapshot_items_without_prorata_or_duplicates(): void
    {
        [$central] = $this->central();
        [$branch, $relationship] = $this->activeBranch($central);
        $start = now()->addMonth()->startOfDay();
        $relationship->update(['billing_effective_at' => $start]);

        $invoice = app(ConsolidatedBillingService::class)->createInvoice($central, $start, $start->copy()->addMonth(), $start);
        $this->assertSame(config('billing.monthly_price') + config('billing.branch_monthly_price'), $invoice->amount);
        $this->assertCount(2, $invoice->items);
        $this->assertDatabaseHas('billing_invoice_items', ['billing_invoice_id' => $invoice->id, 'type' => 'branch_addon', 'branch_tenant_id' => $branch->id, 'unit_amount' => 20000]);

        $sameInvoice = app(ConsolidatedBillingService::class)->createInvoice($central, $start, $start->copy()->addMonth(), $start);
        $this->assertSame($invoice->id, $sameInvoice->id);
        $this->assertDatabaseCount('billing_invoice_items', 2);

        [$lateBranch, $lateRelationship] = $this->activeBranch($central, 'Cabang Terlambat');
        $lateRelationship->update(['billing_effective_at' => $start->copy()->addDay()]);
        $this->assertDatabaseMissing('billing_invoice_items', ['billing_invoice_id' => $invoice->id, 'branch_tenant_id' => $lateBranch->id]);
    }

    public function test_expired_central_locks_branch_and_approved_payment_recovers_whole_network(): void
    {
        [$central] = $this->central();
        [$branch, $relationship, $branchOwner] = $this->activeBranch($central);
        $central->subscription->update(['is_grandfathered' => false, 'status' => 'active', 'current_period_end' => now()->subMinute()]);
        $branch->subscription->update(['is_grandfathered' => false, 'status' => 'active', 'current_period_end' => now()->subMinute()]);
        $start = now();
        $relationship->update(['billing_effective_at' => $start->copy()->subMonth()]);
        $invoice = app(ConsolidatedBillingService::class)->createInvoice($central, $start, $start->copy()->addMonth(), $start);
        $payment = SubscriptionPayment::create([
            'tenant_id' => $central->id, 'billing_invoice_id' => $invoice->id, 'amount' => $invoice->amount,
            'payment_method' => 'bank_transfer', 'proof_path' => 'test/proof.jpg', 'status' => 'pending', 'submitted_at' => now(),
        ]);

        $this->actingAs($branchOwner)->get(route('tenant.dashboard'))->assertRedirect(route('tenant.billing.index'));
        $admin = User::factory()->create(['role' => UserRole::Superadmin]);
        $this->actingAs($admin)->patch(route('admin.billing.approve', $payment))->assertSessionHasNoErrors();
        $this->assertSame('active', $branch->subscription->fresh()->status);
        $this->assertTrue($branch->subscription->fresh()->current_period_end->isFuture());
        $this->actingAs($branchOwner)->get(route('tenant.dashboard'))->assertOk();
    }

    public function test_only_related_central_owner_can_impersonate_branch_and_session_is_audited(): void
    {
        [$central, $centralOwner] = $this->central();
        [$branch, , $branchOwner] = $this->activeBranch($central);
        [, $otherOwner] = $this->central('Pusat Lain', 'LAIN-01');

        $this->actingAs($otherOwner)->post(route('tenant.network.impersonate', $branch))->assertForbidden();
        $this->actingAs($centralOwner)->post(route('tenant.network.impersonate', $branch))->assertRedirect(route('tenant.dashboard'));
        $this->assertAuthenticatedAs($branchOwner);
        $this->assertDatabaseHas('tenant_impersonation_logs', ['actor_user_id' => $centralOwner->id, 'parent_tenant_id' => $central->id, 'branch_tenant_id' => $branch->id, 'ended_at' => null]);
        $this->post(route('impersonation.stop'))->assertRedirect(route('tenant.network.index'));
        $this->assertAuthenticatedAs($centralOwner);
        $this->assertNotNull(TenantImpersonationLog::first()->ended_at);
    }

    public function test_detach_is_effective_at_paid_period_end_and_creates_regular_invoice(): void
    {
        [$central, $centralOwner] = $this->central();
        [$branch, $relationship, $branchOwner] = $this->activeBranch($central);
        $periodEnd = now()->addDays(10)->startOfSecond();
        $central->subscription->update(['current_period_end' => $periodEnd, 'is_grandfathered' => false, 'status' => 'active']);

        $this->actingAs($branchOwner)->post(route('tenant.network.exit.request', $relationship), ['reason' => 'Akan mandiri'])->assertSessionHasNoErrors();
        $this->actingAs($centralOwner)->patch(route('tenant.network.exit.decision', $relationship), ['decision' => 'approve'])->assertSessionHasNoErrors();
        $this->assertSame('detached_pending', $relationship->fresh()->status);
        $this->assertTrue($relationship->fresh()->detach_effective_at->equalTo($periodEnd));

        Carbon::setTestNow($periodEnd->copy()->addSecond());
        app(BranchNetworkService::class)->syncDueTransitions($branch);
        $this->assertSame('detached', $relationship->fresh()->status);
        $this->assertSame('standalone', $branch->fresh()->tenant_type);
        $this->assertDatabaseHas('billing_invoices', ['tenant_id' => $branch->id, 'status' => 'open', 'amount' => config('billing.monthly_price')]);
        Carbon::setTestNow();
    }

    /** @return array{Tenant, User} */
    private function central(string $name = 'Pusat Utama', string $code = 'PUSAT-01'): array
    {
        $tenant = Tenant::factory()->create(['name' => $name, 'tenant_type' => 'central', 'branch_network_code' => $code]);
        $owner = User::factory()->create(['tenant_id' => $tenant->id, 'role' => UserRole::Owner]);

        return [$tenant, $owner];
    }

    /** @return array{Tenant, TenantBranchRelationship, User} */
    private function activeBranch(Tenant $central, string $name = 'Cabang Satu'): array
    {
        $branch = Tenant::factory()->create(['name' => $name, 'tenant_type' => 'branch']);
        $owner = User::factory()->create(['tenant_id' => $branch->id, 'role' => UserRole::Owner]);
        $relationship = TenantBranchRelationship::create([
            'parent_tenant_id' => $central->id, 'branch_tenant_id' => $branch->id,
            'network_code_used' => $central->branch_network_code, 'status' => 'active',
            'requested_at' => now()->subMonth(), 'parent_approved_at' => now()->subMonth(),
            'admin_approved_at' => now()->subMonth(), 'billing_effective_at' => now()->subDay(),
        ]);

        return [$branch, $relationship, $owner];
    }
}
