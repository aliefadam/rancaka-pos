<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\BillingInvoice;
use App\Models\SalesCommission;
use App\Models\SalesProfile;
use App\Models\SubscriptionPayment;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Tests\TestCase;

class SalesReferralCommissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_superadmin_can_manage_sales_and_codes_are_normalized(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Superadmin, 'tenant_id' => null]);

        $this->actingAs($admin)->post(route('admin.sales.store'), [
            'name' => 'Budi Sales',
            'username' => 'budi.sales',
            'password' => 'password123',
            'email' => 'budi@example.com',
            'phone' => '0812345678',
            'referral_code' => ' salesbudi ',
            'commission_rate' => '10.50',
            'status' => 'active',
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('sales_profiles', [
            'name' => 'Budi Sales',
            'referral_code' => 'SALESBUDI',
            'commission_rate' => 10.50,
        ]);
        $this->assertDatabaseHas('users', [
            'username' => 'budi.sales',
            'role' => UserRole::Sales->value,
            'tenant_id' => null,
        ]);
        $this->actingAs($admin)->get(route('admin.sales.index'))->assertOk();

        $owner = User::factory()->create(['role' => UserRole::Owner]);
        $this->actingAs($owner)->get(route('admin.sales.index'))->assertForbidden();
    }

    public function test_manual_registration_accepts_only_an_active_referral_code(): void
    {
        $sales = $this->sales();

        $this->post(route('register'), $this->registrationPayload(['referral_code' => 'unknown']))
            ->assertSessionHasErrors('referral_code');

        $this->post(route('register'), $this->registrationPayload(['referral_code' => strtolower($sales->referral_code)]))
            ->assertRedirect(route('tenant.dashboard'));

        $tenant = Tenant::where('email', 'kedai-referral@example.com')->firstOrFail();
        $this->assertSame($sales->id, $tenant->referred_by_sales_id);
        $this->assertSame('SALESBUDI', $tenant->referral_code_used);
        $this->assertNotNull($tenant->referred_at);
    }

    public function test_sales_login_only_sees_own_downline_and_estimated_commission(): void
    {
        $salesUser = User::factory()->create([
            'username' => 'sales.login',
            'password' => 'password123',
            'role' => UserRole::Sales,
            'tenant_id' => null,
        ]);
        $sales = $this->sales(['user_id' => $salesUser->id, 'commission_rate' => 10]);
        $otherUser = User::factory()->create(['role' => UserRole::Sales, 'tenant_id' => null]);
        $otherSales = $this->sales([
            'user_id' => $otherUser->id,
            'name' => 'Sales Lain',
            'referral_code' => 'SALESLain',
        ]);

        $ownTenant = Tenant::factory()->create([
            'name' => 'Tenant Milik Sales',
            'referred_by_sales_id' => $sales->id,
            'referral_code_used' => $sales->referral_code,
            'referred_at' => now(),
        ]);
        BillingInvoice::create([
            'tenant_id' => $ownTenant->id,
            'subscription_id' => $ownTenant->subscription->id,
            'number' => 'INV-PROJECTION',
            'status' => 'open',
            'amount' => 149000,
            'due_at' => now()->addDays(14),
        ]);
        Tenant::factory()->create([
            'name' => 'Tenant Sales Lain',
            'referred_by_sales_id' => $otherSales->id,
            'referral_code_used' => $otherSales->referral_code,
            'referred_at' => now(),
        ]);

        $this->post(route('login'), [
            'username' => 'sales.login',
            'password' => 'password123',
        ])->assertRedirect(route('sales.dashboard'));

        $this->get(route('sales.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Sales/Dashboard')
                ->where('metrics.referrals', 1)
                ->where('metrics.estimated_total', 14900)
                ->has('downlines', 1)
                ->where('downlines.0.name', 'Tenant Milik Sales')
                ->where('downlines.0.commission_status', 'projected'));
    }

    public function test_only_first_approved_subscription_payment_creates_commission(): void
    {
        $sales = $this->sales(['commission_rate' => 10]);
        $tenant = Tenant::factory()->create([
            'referred_by_sales_id' => $sales->id,
            'referral_code_used' => $sales->referral_code,
            'referred_at' => now(),
        ]);
        $admin = User::factory()->create(['role' => UserRole::Superadmin, 'tenant_id' => null]);

        $firstPayment = $this->payment($tenant, 'INV-FIRST', 149000);
        $this->actingAs($admin)->patch(route('admin.billing.approve', $firstPayment))->assertSessionHasNoErrors();

        $this->assertDatabaseHas('sales_commissions', [
            'tenant_id' => $tenant->id,
            'subscription_payment_id' => $firstPayment->id,
            'base_amount' => 149000,
            'commission_rate_snapshot' => 10,
            'commission_amount' => 14900,
            'status' => 'accrued',
        ]);

        $secondSales = $this->sales([
            'name' => 'Siti Sales',
            'referral_code' => 'SALESSITI',
            'commission_rate' => 5,
        ]);
        $secondTenant = Tenant::factory()->create([
            'referred_by_sales_id' => $secondSales->id,
            'referral_code_used' => $secondSales->referral_code,
            'referred_at' => now(),
        ]);
        $differentRatePayment = $this->payment($secondTenant, 'INV-RATE-FIVE', 149000);
        $this->actingAs($admin)->patch(route('admin.billing.approve', $differentRatePayment))->assertSessionHasNoErrors();
        $this->assertDatabaseHas('sales_commissions', [
            'tenant_id' => $secondTenant->id,
            'commission_rate_snapshot' => 5,
            'commission_amount' => 7450,
        ]);

        $sales->update(['commission_rate' => 25]);
        $secondPayment = $this->payment($tenant, 'INV-SECOND', 149000);
        $this->actingAs($admin)->patch(route('admin.billing.approve', $secondPayment))->assertSessionHasNoErrors();

        $this->assertSame(1, SalesCommission::where('tenant_id', $tenant->id)->count());
        $this->assertSame('10.00', SalesCommission::where('tenant_id', $tenant->id)->firstOrFail()->commission_rate_snapshot);
    }

    public function test_fixed_commission_is_stored_and_applied_as_a_nominal_value(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Superadmin, 'tenant_id' => null]);

        $this->actingAs($admin)->post(route('admin.sales.store'), [
            'name' => 'Sales Nominal',
            'username' => 'sales.nominal',
            'password' => 'password123',
            'referral_code' => 'NOMINAL50',
            'commission_type' => 'fixed',
            'commission_value' => 50000,
            'status' => 'active',
        ])->assertSessionHasNoErrors();

        $sales = SalesProfile::where('referral_code', 'NOMINAL50')->firstOrFail();
        $this->assertSame('fixed', $sales->commission_type);
        $this->assertSame(50000, $sales->commission_value);
        $this->assertSame('0.00', $sales->commission_rate);

        $tenant = Tenant::factory()->create([
            'referred_by_sales_id' => $sales->id,
            'referral_code_used' => $sales->referral_code,
            'referred_at' => now(),
        ]);
        $payment = $this->payment($tenant, 'INV-FIXED', 149000);

        $this->actingAs($admin)->patch(route('admin.billing.approve', $payment))->assertSessionHasNoErrors();

        $this->assertDatabaseHas('sales_commissions', [
            'tenant_id' => $tenant->id,
            'base_amount' => 149000,
            'commission_type_snapshot' => 'fixed',
            'commission_value_snapshot' => 50000,
            'commission_amount' => 50000,
        ]);
    }

    public function test_google_onboarding_preserves_referral_code(): void
    {
        $sales = $this->sales();
        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-referral',
            'name' => 'Owner Google',
            'email' => 'google-referral@example.com',
        ]));

        $this->withSession(['registration_referral_code' => $sales->referral_code])
            ->get(route('auth.google.callback'))
            ->assertRedirect(route('onboarding.store.create'));

        $this->post(route('onboarding.store.store'), [
            'store_name' => 'Kedai Google Referral',
            'phone' => '081234567890',
            'address' => 'Bandung',
            'username' => 'owner.google.referral',
            'referral_code' => $sales->referral_code,
        ])->assertRedirect(route('tenant.dashboard'));

        $this->assertDatabaseHas('tenants', [
            'email' => 'google-referral@example.com',
            'referred_by_sales_id' => $sales->id,
            'referral_code_used' => $sales->referral_code,
        ]);
        $this->assertNull(session('registration_referral_code'));
    }

    public function test_superadmin_can_record_manual_payout_only_once(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Superadmin, 'tenant_id' => null]);
        $commission = $this->commission();

        $this->actingAs($admin)->post(route('admin.commission-payouts.store'), [
            'commission_ids' => [$commission->id],
            'note' => 'Transfer bank',
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('commission_payouts', [
            'sales_profile_id' => $commission->sales_profile_id,
            'amount' => $commission->commission_amount,
            'status' => 'paid',
        ]);
        $this->assertDatabaseHas('sales_commissions', ['id' => $commission->id, 'status' => 'paid', 'paid_by' => $admin->id]);

        $this->actingAs($admin)->post(route('admin.commission-payouts.store'), [
            'commission_ids' => [$commission->id],
        ])->assertStatus(422);

        $this->assertDatabaseCount('commission_payouts', 1);
    }

    public function test_referral_can_only_be_corrected_before_first_approved_payment(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Superadmin, 'tenant_id' => null]);
        $sales = $this->sales();
        $tenant = Tenant::factory()->create();

        $this->actingAs($admin)->patch(route('admin.sales.tenant-referral.update', $tenant), [
            'sales_profile_id' => $sales->id,
        ])->assertSessionHasNoErrors();
        $this->assertSame($sales->id, $tenant->fresh()->referred_by_sales_id);

        $payment = $this->payment($tenant, 'INV-LOCKED', 149000);
        $payment->update(['status' => 'approved']);

        $this->actingAs($admin)->patch(route('admin.sales.tenant-referral.update', $tenant), [
            'sales_profile_id' => null,
        ])->assertSessionHasErrors('tenant_id');
        $this->assertSame($sales->id, $tenant->fresh()->referred_by_sales_id);
    }

    private function sales(array $attributes = []): SalesProfile
    {
        return SalesProfile::create(array_merge([
            'name' => 'Budi Sales',
            'referral_code' => 'SALESBUDI',
            'commission_rate' => 10,
            'status' => 'active',
        ], $attributes));
    }

    private function registrationPayload(array $attributes = []): array
    {
        return array_merge([
            'store_name' => 'Kedai Referral',
            'owner_name' => 'Owner Referral',
            'email' => 'kedai-referral@example.com',
            'phone' => '081234567890',
            'username' => 'owner.referral',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ], $attributes);
    }

    private function payment(Tenant $tenant, string $number, int $amount): SubscriptionPayment
    {
        $invoice = BillingInvoice::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $tenant->subscription->id,
            'number' => $number,
            'status' => 'pending',
            'amount' => $amount,
            'due_at' => now()->addDay(),
        ]);

        return SubscriptionPayment::create([
            'tenant_id' => $tenant->id,
            'billing_invoice_id' => $invoice->id,
            'amount' => $amount,
            'payment_method' => 'bank_transfer',
            'proof_path' => 'billing/test.jpg',
            'status' => 'pending',
            'submitted_at' => now(),
        ]);
    }

    private function commission(): SalesCommission
    {
        $sales = $this->sales();
        $tenant = Tenant::factory()->create(['referred_by_sales_id' => $sales->id]);
        $payment = $this->payment($tenant, 'INV-PAYOUT', 149000);

        return SalesCommission::create([
            'sales_profile_id' => $sales->id,
            'tenant_id' => $tenant->id,
            'billing_invoice_id' => $payment->billing_invoice_id,
            'subscription_payment_id' => $payment->id,
            'base_amount' => 149000,
            'commission_rate_snapshot' => 10,
            'commission_amount' => 14900,
            'status' => 'accrued',
            'approved_at' => now(),
        ]);
    }
}
