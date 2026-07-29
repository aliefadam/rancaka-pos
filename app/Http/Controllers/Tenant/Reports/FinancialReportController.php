<?php

namespace App\Http\Controllers\Tenant\Reports;

use App\Enums\TransactionStatus;
use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionItem;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class FinancialReportController extends Controller
{
    public function index(Request $request): Response
    {
        Carbon::setLocale('id');

        $tenantId = $request->user()->tenant_id;
        $period = in_array($request->string('period')->toString(), ['daily', 'monthly', 'yearly'], true)
            ? $request->string('period')->toString()
            : 'daily';
        [$periodStart, $periodEnd, $periodLabel] = $this->periodRange($period);

        $revenue = (int) Transaction::query()
            ->where('tenant_id', $tenantId)
            ->where('status', TransactionStatus::Completed)
            ->where('created_at', '>=', $periodStart)
            ->where('created_at', '<', $periodEnd)
            ->sum('total');

        $expenses = (int) Expense::query()
            ->where('tenant_id', $tenantId)
            ->where('expense_date', '>=', $periodStart)
            ->where('expense_date', '<', $periodEnd)
            ->sum('amount');

        $yearStart = Carbon::today()->startOfYear();
        $yearEnd = $yearStart->copy()->addYear();
        $monthlyRevenue = Transaction::query()
            ->where('tenant_id', $tenantId)
            ->where('status', TransactionStatus::Completed)
            ->where('created_at', '>=', $yearStart)
            ->where('created_at', '<', $yearEnd)
            ->get(['total', 'created_at'])
            ->groupBy(fn (Transaction $transaction) => $transaction->created_at->month)
            ->map(fn (Collection $transactions) => (int) $transactions->sum('total'));

        $annualChart = collect(range(1, 12))->map(function (int $month) use ($monthlyRevenue, $yearStart): array {
            $date = $yearStart->copy()->month($month);

            return [
                'month' => $date->translatedFormat('M'),
                'fullMonth' => $date->translatedFormat('F'),
                'value' => $monthlyRevenue->get($month, 0),
            ];
        });

        $salesByProduct = TransactionItem::query()
            ->selectRaw('transaction_items.product_id, SUM(transaction_items.quantity) as sold, SUM(transaction_items.subtotal) as revenue')
            ->join('transactions', 'transactions.id', '=', 'transaction_items.transaction_id')
            ->where('transactions.tenant_id', $tenantId)
            ->where('transactions.status', TransactionStatus::Completed->value)
            ->where('transactions.created_at', '>=', $periodStart)
            ->where('transactions.created_at', '<', $periodEnd)
            ->whereNotNull('transaction_items.product_id')
            ->groupBy('transaction_items.product_id')
            ->get()
            ->keyBy('product_id');

        $productPerformance = Product::query()
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->get(['id', 'name'])
            ->map(function (Product $product) use ($salesByProduct): array {
                $sale = $salesByProduct->get($product->id);

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'sold' => (int) ($sale?->sold ?? 0),
                    'revenue' => (int) ($sale?->revenue ?? 0),
                    'formattedRevenue' => $this->formatRupiah((int) ($sale?->revenue ?? 0)),
                ];
            });

        return Inertia::render('Tenant/Reports/Financial/Index', [
            'period' => $period,
            'periodLabel' => $periodLabel,
            'summary' => [
                'revenue' => $this->formatRupiah($revenue),
                'expenses' => $this->formatRupiah($expenses),
                'netProfit' => $this->formatRupiah($revenue - $expenses),
                'netProfitValue' => $revenue - $expenses,
            ],
            'annualChart' => $annualChart,
            'chartYear' => $yearStart->year,
            'topProducts' => $productPerformance
                ->filter(fn (array $product) => $product['sold'] > 0)
                ->sortByDesc(fn (array $product) => [$product['sold'], $product['revenue']])
                ->take(5)
                ->values(),
            'lowProducts' => $productPerformance
                ->sortBy(fn (array $product) => [$product['sold'], $product['revenue']])
                ->take(5)
                ->values(),
        ]);
    }

    /**
     * @return array{Carbon, Carbon, string}
     */
    private function periodRange(string $period): array
    {
        $today = Carbon::today();

        return match ($period) {
            'monthly' => [
                $today->copy()->startOfMonth(),
                $today->copy()->startOfMonth()->addMonth(),
                $today->translatedFormat('F Y'),
            ],
            'yearly' => [
                $today->copy()->startOfYear(),
                $today->copy()->startOfYear()->addYear(),
                $today->translatedFormat('Y'),
            ],
            default => [
                $today,
                $today->copy()->addDay(),
                $today->translatedFormat('d F Y'),
            ],
        };
    }

    private function formatRupiah(int $value): string
    {
        $prefix = $value < 0 ? '-Rp ' : 'Rp ';

        return $prefix.number_format(abs($value), 0, ',', '.');
    }
}
