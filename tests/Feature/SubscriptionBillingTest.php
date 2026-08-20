<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\BillingInvoice;
use App\Models\SubscriptionPayment;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SubscriptionBillingTest extends TestCase
{
    use RefreshDatabase;

    public function test_visitor_can_register_tenant_with_trial_and_first_invoice(): void
    {
        $this->post(route('register'), [
            'store_name' => 'Kedai Baru',
            'owner_name' => 'Budi Owner',
            'email' => 'kedai@example.com',
            'phone' => '081234567890',
            'username' => 'budi.owner',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertRedirect(route('tenant.dashboard'));

        $this->assertAuthenticated();
        $this->assertDatabaseHas('tenants', ['name' => 'Kedai Baru', 'email' => 'kedai@example.com']);
        $this->assertDatabaseHas('subscriptions', ['status' => 'trialing', 'is_grandfathered' => false]);
        $this->assertDatabaseHas('billing_invoices', ['status' => 'open', 'amount' => config('billing.monthly_price')]);
    }

    public function test_expired_tenant_is_redirected_to_billing(): void
    {
        [$tenant, $owner] = $this->tenantOwner();
        $tenant->subscription->update(['is_grandfathered' => false, 'status' => 'active', 'current_period_end' => now()->subDay()]);

        $this->actingAs($owner)->get(route('tenant.dashboard'))
            ->assertRedirect(route('tenant.billing.index'));
    }

    public function test_inactive_tenant_cannot_log_in(): void
    {
        [$tenant, $owner] = $this->tenantOwner();
        $tenant->update(['status' => 'inactive']);

        $this->post(route('login'), [
            'username' => $owner->username,
            'password' => 'password',
        ])->assertSessionHasErrors('username');

        $this->assertGuest();
    }

    public function test_owner_submits_payment_and_superadmin_approves_it(): void
    {
        Storage::fake('public');
        [$tenant, $owner] = $this->tenantOwner();
        $subscription = $tenant->subscription;
        $subscription->update(['plan_name' => 'Bulanan', 'price' => 149000, 'status' => 'trialing', 'is_grandfathered' => false, 'trial_ends_at' => now()->addDays(14)]);
        $invoice = BillingInvoice::create(['tenant_id' => $tenant->id, 'subscription_id' => $subscription->id, 'number' => 'INV-TEST', 'status' => 'open', 'amount' => 149000, 'due_at' => now()->addDays(14)]);

        $this->actingAs($owner)->post(route('tenant.billing.submit', $invoice), [
            'proof' => UploadedFile::fake()->image('transfer.jpg'),
            'note' => 'Transfer hari ini',
        ])->assertSessionHasNoErrors();

        $payment = SubscriptionPayment::firstOrFail();
        $this->assertSame('pending', $invoice->fresh()->status);
        Storage::disk('public')->assertExists($payment->proof_path);

        $admin = User::factory()->create(['role' => UserRole::Superadmin, 'tenant_id' => null]);
        $this->actingAs($admin)->patch(route('admin.billing.approve', $payment))->assertSessionHasNoErrors();

        $this->assertSame('approved', $payment->fresh()->status);
        $this->assertSame('paid', $invoice->fresh()->status);
        $this->assertSame('active', $subscription->fresh()->status);
        $this->assertDatabaseCount('billing_invoices', 2);
    }

    /** @return array{Tenant, User} */
    private function tenantOwner(): array
    {
        $tenant = Tenant::factory()->create(['status' => 'active']);
        $owner = User::factory()->create(['tenant_id' => $tenant->id, 'role' => UserRole::Owner]);

        return [$tenant, $owner];
    }
}
