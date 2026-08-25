<?php

namespace Tests\Feature;

use App\Enums\PaymentMethod;
use App\Enums\TransactionStatus;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Expense;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Shift;
use App\Models\Supplier;
use App\Models\SupplierPayment;
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
            'cost_snapshot' => 6000,
            'total_cost_snapshot' => 30000,
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
        $previousTransaction = Transaction::create([
            'tenant_id' => $tenant->id,
            'shift_id' => $shift->id,
            'user_id' => $owner->id,
            'invoice_number' => 'TRX-PREVIOUS-001',
            'status' => TransactionStatus::Completed,
            'payment_method' => PaymentMethod::Cash,
            'subtotal' => 50000,
            'additional_fee' => 0,
            'total' => 50000,
        ]);
        $previousTransaction->forceFill([
            'created_at' => now()->subMonthNoOverflow(),
            'updated_at' => now()->subMonthNoOverflow(),
        ])->saveQuietly();
        Expense::create([
            'tenant_id' => $tenant->id,
            'user_id' => $owner->id,
            'expense_date' => today(),
            'category' => 'Operasional',
            'amount' => 30000,
            'description' => 'Biaya operasional',
            'receipt_path' => 'expenses/test.pdf',
        ]);
        $supplier = Supplier::create([
            'tenant_id' => $tenant->id,
            'name' => 'Supplier Laporan',
        ]);
        $purchase = Purchase::create([
            'tenant_id' => $tenant->id,
            'supplier_id' => $supplier->id,
            'number' => 'PUR-REPORT-001',
            'purchase_date' => today(),
            'payment_term' => 'paid',
            'items_subtotal' => 40000,
            'total_amount' => 40000,
            'paid_amount' => 40000,
            'balance_amount' => 0,
            'payment_status' => 'paid',
            'created_by' => $owner->id,
        ]);
        SupplierPayment::create([
            'tenant_id' => $tenant->id,
            'supplier_id' => $supplier->id,
            'purchase_id' => $purchase->id,
            'number' => 'PAY-REPORT-001',
            'payment_date' => today(),
            'amount' => 40000,
            'payment_method' => 'cash',
            'created_by' => $owner->id,
        ]);

        $response = $this->actingAs($owner)->get(route(
            'tenant.reports.financial.index',
            ['period' => 'monthly'],
        ));

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Tenant/Reports/Financial/Index')
            ->where('filters.period', 'monthly')
            ->where('filters.month', now()->format('Y-m'))
            ->where('summary.revenue', 'Rp 100.000')
            ->where('summary.expenses', 'Rp 30.000')
            ->where('summary.supplierPayments', 'Rp 40.000')
            ->where('summary.costOfGoodsSold', 'Rp 30.000')
            ->where('summary.grossProfit', 'Rp 70.000')
            ->where('summary.netProfit', 'Rp 40.000')
            ->where('summary.netProfitValue', 40000)
            ->where('summary.transactionCount', 1)
            ->where('comparison.revenue.previousValue', 50000)
            ->where('comparison.revenue.percentage', 100)
            ->where('comparison.costOfGoodsSold.previousValue', 0)
            ->where('comparison.costOfGoodsSold.percentage', null)
            ->where('chart.'.(now()->day - 1).'.revenue', 100000)
            ->where('chart.'.(now()->day - 1).'.expenses', 30000)
            ->where('chart.'.(now()->day - 1).'.supplierPayments', 40000)
            ->where('chart.'.(now()->day - 1).'.costOfGoodsSold', 30000)
            ->where('chart.'.(now()->day - 1).'.netProfit', 40000)
            ->where('topProducts.0.name', 'Kopi Susu')
            ->where('topProducts.0.sold', 5)
            ->where('lowProducts.0.name', 'Produk Belum Laku')
            ->where('lowProducts.0.sold', 0)
        );

        $this->actingAs($owner)
            ->get(route('tenant.reports.financial.index', [
                'period' => 'monthly',
                'month' => now()->subMonthNoOverflow()->format('Y-m'),
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.month', now()->subMonthNoOverflow()->format('Y-m'))
                ->where('summary.revenue', 'Rp 50.000')
                ->where('summary.transactionCount', 1));

        $this->actingAs($owner)
            ->get(route('tenant.reports.financial.index', [
                'period' => 'daily',
                'date' => now()->toDateString(),
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.period', 'daily')
                ->where('chartMeta.granularityLabel', 'Jam')
                ->has('chart', 24)
                ->where('chart.'.now()->hour.'.revenue', 100000));

        $this->actingAs($owner)
            ->get(route('tenant.reports.financial.index', [
                'period' => 'yearly',
                'year' => now()->year,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.period', 'yearly')
                ->where('chartMeta.granularityLabel', 'Bulan')
                ->has('chart', 12)
                ->where('summary.revenue', 'Rp 150.000')
                ->where('chart.'.(now()->month - 1).'.revenue', 100000));

        $this->actingAs($owner)
            ->get(route('tenant.reports.financial.index', [
                'period' => 'custom',
                'start_date' => now()->toDateString(),
                'end_date' => now()->toDateString(),
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.period', 'custom')
                ->where('chartMeta.granularityLabel', 'Tanggal')
                ->has('chart', 1)
                ->where('chart.0.revenue', 100000));

        $this->actingAs($owner)
            ->get(route('tenant.reports.financial.index', [
                'period' => 'custom',
                'start_date' => now()->subDays(500)->toDateString(),
                'end_date' => now()->toDateString(),
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.start_date', now()->subDays(365)->toDateString())
                ->where('filters.end_date', now()->toDateString())
                ->where('chartMeta.granularityLabel', 'Bulan'));
    }
}
