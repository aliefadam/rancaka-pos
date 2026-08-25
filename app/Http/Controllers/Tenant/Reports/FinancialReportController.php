<?php

namespace App\Http\Controllers\Tenant\Reports;

use App\Enums\TransactionStatus;
use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Product;
use App\Models\SupplierPayment;
use App\Models\Transaction;
use App\Models\TransactionItem;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class FinancialReportController extends Controller
{
    public function index(Request $request): Response
    {
        Carbon::setLocale('id');

        $tenantId = $request->user()->tenant_id;
        $filters = $this->resolveFilters($request);
        [$periodStart, $periodEnd, $periodLabel, $granularity] = $this->periodRange($filters);
        [$previousStart, $previousEnd] = $this->previousPeriodRange($filters['period'], $periodStart, $periodEnd);

        $transactions = Transaction::query()
            ->where('tenant_id', $tenantId)
            ->where('status', TransactionStatus::Completed)
            ->where('created_at', '>=', $periodStart)
            ->where('created_at', '<', $periodEnd)
            ->withSum('items as cost_of_goods_sold', 'total_cost_snapshot')
            ->get(['id', 'total', 'created_at']);

        $expenses = Expense::query()
            ->where('tenant_id', $tenantId)
            ->where('expense_date', '>=', $periodStart->toDateString())
            ->where('expense_date', '<', $periodEnd->toDateString())
            ->get(['amount', 'expense_date', 'created_at']);

        $supplierPayments = SupplierPayment::query()
            ->where('tenant_id', $tenantId)->where('status', 'valid')
            ->where('payment_date', '>=', $periodStart->toDateString())
            ->where('payment_date', '<', $periodEnd->toDateString())
            ->get(['amount', 'payment_date', 'created_at']);

        $revenue = (int) $transactions->sum('total');
        $operatingExpenseTotal = (int) $expenses->sum('amount');
        $supplierPaymentTotal = (int) $supplierPayments->sum('amount');
        $expenseTotal = $operatingExpenseTotal + $supplierPaymentTotal;
        $costOfGoodsSold = (int) $transactions->sum('cost_of_goods_sold');
        $netProfit = $revenue - $costOfGoodsSold - $operatingExpenseTotal;
        $previousSummary = $this->summaryForRange($tenantId, $previousStart, $previousEnd);
        $breakdown = $this->buildBreakdown($periodStart, $periodEnd, $granularity, $transactions, $expenses, $supplierPayments);

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

        $priceOptionSales = TransactionItem::query()
            ->selectRaw('transaction_items.product_name, transaction_items.price_option_name, transaction_items.unit_price, SUM(transaction_items.quantity) as sold, SUM(transaction_items.subtotal) as revenue')
            ->join('transactions', 'transactions.id', '=', 'transaction_items.transaction_id')
            ->where('transactions.tenant_id', $tenantId)
            ->where('transactions.status', TransactionStatus::Completed->value)
            ->where('transactions.created_at', '>=', $periodStart)
            ->where('transactions.created_at', '<', $periodEnd)
            ->groupBy('transaction_items.product_name', 'transaction_items.price_option_name', 'transaction_items.unit_price')
            ->orderByDesc('sold')
            ->get()
            ->map(fn (TransactionItem $item) => [
                'product_name' => $item->product_name,
                'price_option_name' => $item->price_option_name ?: 'Harga utama',
                'unit_price' => (int) $item->unit_price,
                'sold' => (int) $item->sold,
                'revenue' => (int) $item->revenue,
            ]);

        return Inertia::render('Tenant/Reports/Financial/Index', [
            'filters' => $filters,
            'periodLabel' => $periodLabel,
            'summary' => [
                'revenue' => $this->formatRupiah($revenue),
                'revenueValue' => $revenue,
                'expenses' => $this->formatRupiah($expenseTotal),
                'expensesValue' => $expenseTotal,
                'operatingExpenses' => $this->formatRupiah($operatingExpenseTotal),
                'operatingExpensesValue' => $operatingExpenseTotal,
                'supplierPayments' => $this->formatRupiah($supplierPaymentTotal),
                'supplierPaymentsValue' => $supplierPaymentTotal,
                'costOfGoodsSold' => $this->formatRupiah($costOfGoodsSold),
                'costOfGoodsSoldValue' => $costOfGoodsSold,
                'grossProfit' => $this->formatRupiah($revenue - $costOfGoodsSold),
                'netProfit' => $this->formatRupiah($netProfit),
                'netProfitValue' => $netProfit,
                'transactionCount' => $transactions->count(),
            ],
            'comparison' => [
                'label' => $this->previousPeriodLabel($filters['period']),
                'revenue' => $this->comparison($revenue, $previousSummary['revenue']),
                'costOfGoodsSold' => $this->comparison($costOfGoodsSold, $previousSummary['costOfGoodsSold']),
                'expenses' => $this->comparison($expenseTotal, $previousSummary['expenses']),
                'netProfit' => $this->comparison($netProfit, $previousSummary['netProfit']),
            ],
            'chart' => $breakdown,
            'chartMeta' => $this->chartMeta($granularity, $periodLabel),
            'topProducts' => $productPerformance
                ->filter(fn (array $product) => $product['sold'] > 0)
                ->sortByDesc(fn (array $product) => [$product['sold'], $product['revenue']])
                ->take(5)
                ->values(),
            'lowProducts' => $productPerformance
                ->sortBy(fn (array $product) => [$product['sold'], $product['revenue']])
                ->take(5)
                ->values(),
            'priceOptionSales' => $priceOptionSales,
        ]);
    }

    /**
     * @return array{period: string, date: string, month: string, year: string, start_date: string, end_date: string}
     */
    private function resolveFilters(Request $request): array
    {
        $requestedPeriod = $request->string('period')->toString();
        $period = in_array($requestedPeriod, ['daily', 'monthly', 'yearly', 'custom'], true)
            ? $requestedPeriod
            : 'daily';
        $today = Carbon::today();
        $date = $this->parseDate($request->string('date')->toString(), $today);
        $month = $this->parseMonth($request->string('month')->toString(), $today);
        $year = $this->parseYear($request->string('year')->toString(), $today->year);
        $startDate = $this->parseDate($request->string('start_date')->toString(), $today->copy()->subDays(29));
        $endDate = $this->parseDate($request->string('end_date')->toString(), $today);

        if ($startDate->gt($endDate)) {
            [$startDate, $endDate] = [$endDate, $startDate];
        }

        if ($startDate->diffInDays($endDate) > 365) {
            $startDate = $endDate->copy()->subDays(365);
        }

        return [
            'period' => $period,
            'date' => $date->toDateString(),
            'month' => $month->format('Y-m'),
            'year' => (string) $year,
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
        ];
    }

    /**
     * @param  array{period: string, date: string, month: string, year: string, start_date: string, end_date: string}  $filters
     * @return array{Carbon, Carbon, string, string}
     */
    private function periodRange(array $filters): array
    {
        return match ($filters['period']) {
            'monthly' => $this->monthlyRange($filters['month']),
            'yearly' => $this->yearlyRange((int) $filters['year']),
            'custom' => $this->customRange($filters['start_date'], $filters['end_date']),
            default => $this->dailyRange($filters['date']),
        };
    }

    /** @return array{Carbon, Carbon, string, string} */
    private function dailyRange(string $date): array
    {
        $start = Carbon::parse($date)->startOfDay();

        return [$start, $start->copy()->addDay(), $start->translatedFormat('d F Y'), 'hourly'];
    }

    /** @return array{Carbon, Carbon, string, string} */
    private function monthlyRange(string $month): array
    {
        $start = Carbon::parse("{$month}-01")->startOfMonth();

        return [$start, $start->copy()->addMonth(), $start->translatedFormat('F Y'), 'daily'];
    }

    /** @return array{Carbon, Carbon, string, string} */
    private function yearlyRange(int $year): array
    {
        $start = Carbon::create($year, 1, 1)->startOfDay();

        return [$start, $start->copy()->addYear(), (string) $year, 'monthly'];
    }

    /** @return array{Carbon, Carbon, string, string} */
    private function customRange(string $startDate, string $endDate): array
    {
        $start = Carbon::parse($startDate)->startOfDay();
        $end = Carbon::parse($endDate)->startOfDay()->addDay();
        $granularity = $start->diffInDays($end) <= 62 ? 'daily' : 'monthly';

        return [
            $start,
            $end,
            $start->translatedFormat('d M Y').' – '.$end->copy()->subDay()->translatedFormat('d M Y'),
            $granularity,
        ];
    }

    /** @return array{Carbon, Carbon} */
    private function previousPeriodRange(string $period, Carbon $start, Carbon $end): array
    {
        return match ($period) {
            'monthly' => [$start->copy()->subMonth(), $start->copy()],
            'yearly' => [$start->copy()->subYear(), $start->copy()],
            default => [$start->copy()->subDays($start->diffInDays($end)), $start->copy()],
        };
    }

    /** @return array{revenue: int, costOfGoodsSold: int, expenses: int, netProfit: int} */
    private function summaryForRange(int $tenantId, Carbon $start, Carbon $end): array
    {
        $revenue = (int) Transaction::query()
            ->where('tenant_id', $tenantId)
            ->where('status', TransactionStatus::Completed)
            ->where('created_at', '>=', $start)
            ->where('created_at', '<', $end)
            ->sum('total');
        $expenses = (int) Expense::query()
            ->where('tenant_id', $tenantId)
            ->where('expense_date', '>=', $start->toDateString())
            ->where('expense_date', '<', $end->toDateString())
            ->sum('amount');
        $supplierPayments = (int) SupplierPayment::query()->where('tenant_id', $tenantId)->where('status', 'valid')
            ->where('payment_date', '>=', $start->toDateString())->where('payment_date', '<', $end->toDateString())->sum('amount');
        $costOfGoodsSold = (int) TransactionItem::query()
            ->join('transactions', 'transactions.id', '=', 'transaction_items.transaction_id')
            ->where('transactions.tenant_id', $tenantId)
            ->where('transactions.status', TransactionStatus::Completed->value)
            ->where('transactions.created_at', '>=', $start)
            ->where('transactions.created_at', '<', $end)
            ->sum('transaction_items.total_cost_snapshot');

        return [
            'revenue' => $revenue,
            'costOfGoodsSold' => $costOfGoodsSold,
            'expenses' => $expenses + $supplierPayments,
            'netProfit' => $revenue - $costOfGoodsSold - $expenses,
        ];
    }

    /**
     * @param  Collection<int, Transaction>  $transactions
     * @param  Collection<int, Expense>  $expenses
     * @return array<int, array{key: string, label: string, fullLabel: string, revenue: int, expenses: int, netProfit: int, transactions: int}>
     */
    private function buildBreakdown(
        Carbon $start,
        Carbon $end,
        string $granularity,
        Collection $transactions,
        Collection $expenses,
        Collection $supplierPayments,
    ): array {
        $buckets = $this->emptyBuckets($start, $end, $granularity);

        foreach ($transactions as $transaction) {
            $key = $this->bucketKey($transaction->created_at, $granularity);

            if (isset($buckets[$key])) {
                $buckets[$key]['revenue'] += (int) $transaction->total;
                $buckets[$key]['costOfGoodsSold'] += (int) $transaction->cost_of_goods_sold;
                $buckets[$key]['transactions']++;
            }
        }

        foreach ($expenses as $expense) {
            $bucketDate = $expense->expense_date;

            if ($granularity === 'hourly') {
                $bucketDate = $expense->created_at?->isSameDay($expense->expense_date)
                    ? $expense->created_at
                    : $expense->expense_date->copy()->startOfDay();
            }

            $key = $this->bucketKey($bucketDate, $granularity);

            if (isset($buckets[$key])) {
                $buckets[$key]['expenses'] += (int) $expense->amount;
                $buckets[$key]['operatingExpenses'] += (int) $expense->amount;
            }
        }

        foreach ($supplierPayments as $payment) {
            $bucketDate = $granularity === 'hourly' && $payment->created_at?->isSameDay($payment->payment_date)
                ? $payment->created_at : $payment->payment_date->copy()->startOfDay();
            $key = $this->bucketKey($bucketDate, $granularity);
            if (isset($buckets[$key])) {
                $buckets[$key]['expenses'] += (int) $payment->amount;
            }
        }

        return collect($buckets)
            ->map(function (array $bucket): array {
                $bucket['netProfit'] = $bucket['revenue']
                    - $bucket['costOfGoodsSold']
                    - $bucket['operatingExpenses'];

                return $bucket;
            })
            ->values()
            ->all();
    }

    /**
     * @return array<string, array{key: string, label: string, fullLabel: string, revenue: int, expenses: int, netProfit: int, transactions: int}>
     */
    private function emptyBuckets(Carbon $start, Carbon $end, string $granularity): array
    {
        $buckets = [];

        if ($granularity === 'hourly') {
            foreach (range(0, 23) as $hour) {
                $key = str_pad((string) $hour, 2, '0', STR_PAD_LEFT);
                $buckets[$key] = $this->emptyBucket($key, "{$key}:00", "Pukul {$key}:00");
            }

            return $buckets;
        }

        $cursor = $start->copy()->startOfDay();

        if ($granularity === 'monthly') {
            $cursor->startOfMonth();
        }

        while ($cursor->lt($end)) {
            $key = $this->bucketKey($cursor, $granularity);
            $label = $granularity === 'monthly'
                ? $cursor->translatedFormat('M')
                : $cursor->translatedFormat('d M');
            $fullLabel = $granularity === 'monthly'
                ? $cursor->translatedFormat('F Y')
                : $cursor->translatedFormat('l, d F Y');
            $buckets[$key] = $this->emptyBucket($key, $label, $fullLabel);
            $granularity === 'monthly' ? $cursor->addMonth() : $cursor->addDay();
        }

        return $buckets;
    }

    /**
     * @return array{key: string, label: string, fullLabel: string, revenue: int, expenses: int, netProfit: int, transactions: int}
     */
    private function emptyBucket(string $key, string $label, string $fullLabel): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'fullLabel' => $fullLabel,
            'revenue' => 0,
            'expenses' => 0,
            'operatingExpenses' => 0,
            'costOfGoodsSold' => 0,
            'netProfit' => 0,
            'transactions' => 0,
        ];
    }

    private function bucketKey(Carbon $date, string $granularity): string
    {
        return match ($granularity) {
            'hourly' => $date->format('H'),
            'monthly' => $date->format('Y-m'),
            default => $date->toDateString(),
        };
    }

    /** @return array{value: int, previousValue: int, previousFormatted: string, percentage: float|null} */
    private function comparison(int $current, int $previous): array
    {
        return [
            'value' => $current,
            'previousValue' => $previous,
            'previousFormatted' => $this->formatRupiah($previous),
            'percentage' => $previous === 0
                ? ($current === 0 ? 0.0 : null)
                : round((($current - $previous) / abs($previous)) * 100, 1),
        ];
    }

    /** @return array{title: string, subtitle: string, granularityLabel: string, periodBadge: string} */
    private function chartMeta(string $granularity, string $periodLabel): array
    {
        [$title, $subtitle, $granularityLabel] = match ($granularity) {
            'hourly' => ['Arus Keuangan per Jam', 'Pendapatan dan pengeluaran sepanjang hari', 'Jam'],
            'monthly' => ['Arus Keuangan Bulanan', 'Ringkasan setiap bulan pada periode terpilih', 'Bulan'],
            default => ['Arus Keuangan Harian', 'Ringkasan setiap tanggal pada periode terpilih', 'Tanggal'],
        };

        return [
            'title' => $title,
            'subtitle' => $subtitle,
            'granularityLabel' => $granularityLabel,
            'periodBadge' => $periodLabel,
        ];
    }

    private function previousPeriodLabel(string $period): string
    {
        return match ($period) {
            'daily' => 'dibandingkan hari sebelumnya',
            'monthly' => 'dibandingkan bulan sebelumnya',
            'yearly' => 'dibandingkan tahun sebelumnya',
            default => 'dibandingkan rentang sebelumnya',
        };
    }

    private function parseDate(string $value, Carbon $fallback): Carbon
    {
        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return $fallback->copy()->startOfDay();
        }

        try {
            $date = Carbon::createFromFormat('Y-m-d', $value)->startOfDay();

            return $date->toDateString() === $value ? $date : $fallback->copy()->startOfDay();
        } catch (Throwable) {
            return $fallback->copy()->startOfDay();
        }
    }

    private function parseMonth(string $value, Carbon $fallback): Carbon
    {
        if (! preg_match('/^\d{4}-\d{2}$/', $value)) {
            return $fallback->copy()->startOfMonth();
        }

        try {
            $month = Carbon::createFromFormat('Y-m-d', "{$value}-01")->startOfMonth();

            return $month->format('Y-m') === $value ? $month : $fallback->copy()->startOfMonth();
        } catch (Throwable) {
            return $fallback->copy()->startOfMonth();
        }
    }

    private function parseYear(string $value, int $fallback): int
    {
        $year = filter_var($value, FILTER_VALIDATE_INT);

        return $year !== false && $year >= 2000 && $year <= Carbon::today()->year + 1
            ? $year
            : $fallback;
    }

    private function formatRupiah(int $value): string
    {
        $prefix = $value < 0 ? '-Rp ' : 'Rp ';

        return $prefix.number_format(abs($value), 0, ',', '.');
    }
}
