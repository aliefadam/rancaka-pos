<?php

namespace Tests\Feature;

use App\Enums\PaymentMethod;
use App\Enums\TransactionStatus;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Expense;
use App\Models\Product;
use App\Models\Shift;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class FinancialReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_financial_report_uses_real_tenant_data_for_the_selected_period(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $shift = Shift::create([
            'tenant_id' => $tenant->id,
            'user_id' => $owner->id,
            'opening_cash' => 100000,
            'opened_at' => now()->startOfDay(),
        ]);
        $category = Category::factory()->create(['tenant_id' => $tenant->id]);
        $bestSeller = Product::factory()->create([
            'tenant_id' => $tenant->id,
            'category_id' => $category->id,
            'name' => 'Kopi Susu',
            'is_active' => true,
        ]);
        Product::factory()->create([
            'tenant_id' => $tenant->id,
            'category_id' => $category->id,
            'name' => 'Produk Belum Laku',
            'is_active' => true,
        ]);

        $transaction = Transaction::create([
            'tenant_id' => $tenant->id,
            'shift_id' => $shift->id,
            'user_id' => $owner->id,
            'invoice_number' => 'TRX-REPORT-001',
            'status' => TransactionStatus::Completed,
            'payment_method' => PaymentMethod::Cash,
            'subtotal' => 100000,
            'additional_fee' => 0,
            'total' => 100000,
            'created_at' => now(),
        ]);
        $transaction->items()->create([
            'product_id' => $bestSeller->id,
            'product_name' => $bestSeller->name,
            'unit_price' => 20000,
            'quantity' => 5,
            'subtotal' => 100000,
        ]);
        Transaction::create([
            'tenant_id' => $tenant->id,
            'shift_id' => $shift->id,
            'user_id' => $owner->id,
            'invoice_number' => 'TRX-VOID-001',
            'status' => TransactionStatus::Voided,
            'payment_method' => PaymentMethod::Cash,
            'subtotal' => 50000,
            'additional_fee' => 0,
            'total' => 50000,
            'created_at' => now(),
        ]);
        Expense::create([
            'tenant_id' => $tenant->id,
            'user_id' => $owner->id,
            'expense_date' => today(),
            'category' => 'Operasional',
            'amount' => 30000,
            'description' => 'Biaya operasional',
            'receipt_path' => 'expenses/test.pdf',
        ]);

        $response = $this->actingAs($owner)->get(route(
            'tenant.reports.financial.index',
            ['period' => 'monthly'],
        ));

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Tenant/Reports/Financial/Index')
            ->where('period', 'monthly')
            ->where('summary.revenue', 'Rp 100.000')
            ->where('summary.expenses', 'Rp 30.000')
            ->where('summary.netProfit', 'Rp 70.000')
            ->where('summary.netProfitValue', 70000)
            ->where('annualChart.'.(now()->month - 1).'.value', 100000)
            ->where('topProducts.0.name', 'Kopi Susu')
            ->where('topProducts.0.sold', 5)
            ->where('lowProducts.0.name', 'Produk Belum Laku')
            ->where('lowProducts.0.sold', 0)
        );
    }
}
