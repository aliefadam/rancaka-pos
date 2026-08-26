<?php

namespace App\Http\Controllers\Tenant;

use App\Enums\PaymentMethod;
use App\Enums\TransactionStatus;
use App\Http\Controllers\Controller;
use App\Models\CreditSale;
use App\Models\Expense;
use App\Models\Product;
use App\Models\Shift;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use App\Services\ReportOutletScopeService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request, ReportOutletScopeService $outletScopes): Response
    {
        Carbon::setLocale('id');

        $user = $request->user();
        $tenantId = $user->tenant_id;
        $outletScope = $outletScopes->resolve($user, $request->string('scope')->toString());
        $tenantIds = $outletScope['tenant_ids'];
        $requestedPeriod = $request->string('period')->toString();
        $periodKey = in_array($requestedPeriod, ['today', '7days', 'month'], true) ? $requestedPeriod : 'today';
        [$start, $end, $previousStart, $previousEnd, $periodLabel, $comparisonLabel] = $this->periodRange($periodKey);

        $transactions = $this->completedTransactions($tenantIds, $start, $end);
        $previousTransactions = $this->completedTransactions($tenantIds, $previousStart, $previousEnd);
        $revenue = (int) (clone $transactions)->sum('total');
        $transactionCount = (clone $transactions)->count();
        $previousRevenue = (int) (clone $previousTransactions)->sum('total');
        $previousTransactionCount = (clone $previousTransactions)->count();
        $productsSold = $this->productsSold($tenantIds, $start, $end);
        $previousProductsSold = $this->productsSold($tenantIds, $previousStart, $previousEnd);
        $canViewProfit = $user->hasPermission('financial-reports.view');
        $expenses = $canViewProfit ? $this->expenses($tenantIds, $start, $end) : 0;
        $previousExpenses = $canViewProfit ? $this->expenses($tenantIds, $previousStart, $previousEnd) : 0;
        $costOfGoodsSold = $canViewProfit ? $this->costOfGoodsSold($tenantIds, $start, $end) : 0;
        $previousCostOfGoodsSold = $canViewProfit ? $this->costOfGoodsSold($tenantIds, $previousStart, $previousEnd) : 0;
        $netProfit = $revenue - $costOfGoodsSold - $expenses;
        $previousNetProfit = $previousRevenue - $previousCostOfGoodsSold - $previousExpenses;
        $averageTransaction = $transactionCount > 0 ? (int) round($revenue / $transactionCount) : 0;

        $summary = [
            [
                'key' => 'revenue', 'label' => 'Penjualan', 'value' => $this->formatRupiah($revenue),
                'raw_value' => $revenue, 'subtitle' => $periodLabel,
                'comparison' => $this->comparison($revenue, $previousRevenue, $comparisonLabel), 'tone' => 'ink',
            ],
            $canViewProfit ? [
                'key' => 'profit', 'label' => 'Laba Bersih', 'value' => $this->formatRupiah($netProfit),
                'raw_value' => $netProfit, 'subtitle' => 'Penjualan dikurangi HPP dan pengeluaran',
                'comparison' => $this->comparison($netProfit, $previousNetProfit, $comparisonLabel),
                'tone' => $netProfit >= 0 ? 'emerald' : 'rose',
            ] : [
                'key' => 'products', 'label' => 'Produk Terjual', 'value' => number_format($productsSold, 0, ',', '.'),
                'raw_value' => $productsSold, 'subtitle' => 'Total kuantitas produk',
                'comparison' => $this->comparison($productsSold, $previousProductsSold, $comparisonLabel), 'tone' => 'emerald',
            ],
            [
                'key' => 'transactions', 'label' => 'Transaksi', 'value' => number_format($transactionCount, 0, ',', '.'),
                'raw_value' => $transactionCount, 'subtitle' => 'Rata-rata '.$this->formatRupiah($averageTransaction),
                'comparison' => $this->comparison($transactionCount, $previousTransactionCount, $comparisonLabel), 'tone' => 'blue',
            ],
        ];

        $isOwnOutletScope = $tenantIds === [$tenantId];
        $activeShift = $isOwnOutletScope
            ? Shift::query()->where('tenant_id', $tenantId)->whereNull('closed_at')->with('user:id,name')->first()
            : null;

        return Inertia::render('Tenant/Dashboard', [
            'greetingName' => $user->name,
            'todayLabel' => Carbon::today()->translatedFormat('l, d F Y'),
            'filters' => ['period' => $periodKey, 'scope' => $outletScope['value']],
            'outletScope' => $outletScope,
            'periodLabel' => $periodLabel,
            'summary' => $summary,
            'salesTrend' => $this->salesTrend($periodKey, $start, $end, (clone $transactions)->get(['total', 'created_at'])),
            'trendTotal' => $this->formatRupiah($revenue),
            'topProducts' => $this->topProducts($tenantIds, $start, $end),
            'paymentMethods' => $this->paymentMethods(clone $transactions, $revenue),
            'attentionItems' => $isOwnOutletScope ? $this->attentionItems($user, $tenantId, $activeShift) : [],
            'activeShift' => $activeShift ? [
                'id' => $activeShift->id,
                'cashier' => $activeShift->user?->name,
                'opened_at' => $activeShift->opened_at?->translatedFormat('d M Y, H:i'),
                'duration' => $activeShift->opened_at?->diffForHumans(now(), true),
                'is_stale' => $activeShift->opened_at?->lt(Carbon::today()) ?? false,
            ] : null,
            'capabilities' => [
                'can_view_profit' => $canViewProfit,
                'can_view_financial_report' => $user->hasPermission('financial-reports.view'),
                'can_view_stock' => $user->hasPermission('stock-products.view'),
            ],
        ]);
    }

    /** @param array<int, int> $tenantIds */
    private function completedTransactions(array $tenantIds, Carbon $start, Carbon $end): Builder
    {
        return Transaction::query()->whereIn('tenant_id', $tenantIds)->where('status', TransactionStatus::Completed)
            ->where('created_at', '>=', $start)->where('created_at', '<', $end);
    }

    /** @return array{Carbon, Carbon, Carbon, Carbon, string, string} */
    private function periodRange(string $period): array
    {
        $today = Carbon::today();

        if ($period === 'month') {
            $previousStart = $today->copy()->subMonthNoOverflow()->startOfMonth();
            $previousEnd = $previousStart->copy()->addDays(min($today->day, $previousStart->daysInMonth));

            return [
                $today->copy()->startOfMonth(),
                $today->copy()->addDay(),
                $previousStart,
                $previousEnd,
                $today->translatedFormat('F Y'),
                'periode sama bulan lalu',
            ];
        }

        return match ($period) {
            '7days' => [$today->copy()->subDays(6), $today->copy()->addDay(), $today->copy()->subDays(13), $today->copy()->subDays(6), '7 hari terakhir', '7 hari sebelumnya'],
            default => [$today, $today->copy()->addDay(), $today->copy()->subDay(), $today, 'Hari ini', 'kemarin'],
        };
    }

    /** @param array<int, int> $tenantIds */
    private function productsSold(array $tenantIds, Carbon $start, Carbon $end): int
    {
        return (int) TransactionItem::query()->whereHas('transaction', fn (Builder $query) => $query
            ->whereIn('tenant_id', $tenantIds)->where('status', TransactionStatus::Completed)
            ->where('created_at', '>=', $start)->where('created_at', '<', $end))->sum('quantity');
    }

    /** @param array<int, int> $tenantIds */
    private function expenses(array $tenantIds, Carbon $start, Carbon $end): int
    {
        return (int) Expense::query()->whereIn('tenant_id', $tenantIds)
            ->where('expense_date', '>=', $start->toDateString())->where('expense_date', '<', $end->toDateString())->sum('amount');
    }

    /** @param array<int, int> $tenantIds */
    private function costOfGoodsSold(array $tenantIds, Carbon $start, Carbon $end): int
    {
        return (int) TransactionItem::query()
            ->join('transactions', 'transactions.id', '=', 'transaction_items.transaction_id')
            ->whereIn('transactions.tenant_id', $tenantIds)
            ->where('transactions.status', TransactionStatus::Completed->value)
            ->where('transactions.created_at', '>=', $start)
            ->where('transactions.created_at', '<', $end)
            ->sum('transaction_items.total_cost_snapshot');
    }

    /** @return array<int, array<string, mixed>> */
    private function salesTrend(string $period, Carbon $start, Carbon $end, Collection $transactions): array
    {
        if ($period === 'today') {
            $byHour = $transactions->groupBy(fn (Transaction $transaction) => $transaction->created_at->format('H'));

            return collect(range(0, 23))->map(function (int $hour) use ($byHour): array {
                $key = str_pad((string) $hour, 2, '0', STR_PAD_LEFT);

                return ['key' => $key, 'label' => "{$key}:00", 'value' => (int) ($byHour->get($key)?->sum('total') ?? 0)];
            })->all();
        }

        $byDate = $transactions->groupBy(fn (Transaction $transaction) => $transaction->created_at->toDateString());
        $cursor = $start->copy();
        $rows = [];
        while ($cursor->lt($end)) {
            $rows[] = [
                'key' => $cursor->toDateString(),
                'label' => $period === 'month' ? $cursor->format('d') : $cursor->translatedFormat('D'),
                'full_label' => $cursor->translatedFormat('d F Y'),
                'value' => (int) ($byDate->get($cursor->toDateString())?->sum('total') ?? 0),
            ];
            $cursor->addDay();
        }

        return $rows;
    }

    /** @return Collection<int, array{name: string, sold: int, revenue: string}> */
    /** @param array<int, int> $tenantIds */
    private function topProducts(array $tenantIds, Carbon $start, Carbon $end): Collection
    {
        return TransactionItem::query()
            ->selectRaw('transaction_items.product_name, SUM(transaction_items.quantity) as sold, SUM(transaction_items.subtotal) as revenue')
            ->join('transactions', 'transactions.id', '=', 'transaction_items.transaction_id')
            ->whereIn('transactions.tenant_id', $tenantIds)->where('transactions.status', TransactionStatus::Completed->value)
            ->where('transactions.created_at', '>=', $start)->where('transactions.created_at', '<', $end)
            ->groupBy('transaction_items.product_name')->orderByDesc('sold')->orderByDesc('revenue')->limit(3)->get()
            ->map(fn (TransactionItem $item) => ['name' => $item->product_name, 'sold' => (int) $item->sold, 'revenue' => $this->formatRupiah((int) $item->revenue)]);
    }

    /** @return array<int, array<string, mixed>> */
    private function paymentMethods(Builder $transactions, int $revenue): array
    {
        $totals = $transactions->selectRaw('payment_method, SUM(total) as amount')->groupBy('payment_method')->pluck('amount', 'payment_method');

        return collect(PaymentMethod::cases())->map(function (PaymentMethod $method) use ($totals, $revenue): array {
            $amount = (int) ($totals[$method->value] ?? 0);

            return [
                'key' => $method->value,
                'label' => match ($method) {
                    PaymentMethod::Cash => 'Tunai', PaymentMethod::Qris => 'QRIS',
                    PaymentMethod::Online => 'Online', PaymentMethod::Credit => 'Kredit',
                },
                'value' => $this->formatRupiah($amount),
                'percentage' => $revenue > 0 ? round(($amount / $revenue) * 100, 1) : 0,
            ];
        })->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function attentionItems(User $user, int $tenantId, ?Shift $activeShift): array
    {
        $items = [];
        $lowStock = Product::query()->where('tenant_id', $tenantId)->where('is_active', true)
            ->where('track_stock', true)->where('stock', '<=', 5)->orderBy('stock')->get(['name', 'stock']);
        if ($lowStock->isNotEmpty()) {
            $preview = $lowStock->take(2)->map(fn (Product $product) => "{$product->name} ({$product->stock})")->join(', ');
            $items[] = [
                'key' => 'stock', 'label' => $lowStock->count().' stok menipis',
                'detail' => $preview.($lowStock->count() > 2 ? ' dan lainnya' : ''),
                'icon' => 'fi-rr-box-open', 'tone' => 'amber',
                'href' => $user->hasPermission('stock-products.view') ? route('tenant.stock.products.index') : null,
            ];
        }

        $credits = CreditSale::query()->where('tenant_id', $tenantId)->where('status', 'outstanding')->get(['total_amount', 'paid_amount']);
        if ($credits->isNotEmpty()) {
            $remaining = (int) $credits->sum(fn (CreditSale $sale) => $sale->total_amount - $sale->paid_amount);
            $items[] = [
                'key' => 'credit', 'label' => $credits->count().' piutang belum lunas',
                'detail' => 'Sisa '.$this->formatRupiah($remaining), 'icon' => 'fi-rr-hand-holding-usd',
                'tone' => 'rose', 'href' => route('tenant.credit-sales.index'),
            ];
        }

        $heldCount = Transaction::query()->where('tenant_id', $tenantId)->where('status', TransactionStatus::Held)->count();
        if ($heldCount > 0) {
            $items[] = [
                'key' => 'held', 'label' => $heldCount.' transaksi ditahan',
                'detail' => 'Masih menunggu diselesaikan atau dibatalkan', 'icon' => 'fi-rr-clock',
                'tone' => 'blue', 'href' => route('tenant.pos.index'),
            ];
        }

        if ($activeShift?->opened_at?->lt(Carbon::today())) {
            $items[] = [
                'key' => 'shift', 'label' => 'Shift belum ditutup',
                'detail' => 'Dibuka '.$activeShift->opened_at->diffForHumans(), 'icon' => 'fi-rr-time-check',
                'tone' => 'amber', 'href' => route('tenant.pos.index'),
            ];
        }

        return array_slice($items, 0, 4);
    }

    /** @return array{percentage: float|null, direction: int, label: string} */
    private function comparison(int $current, int $previous, string $label): array
    {
        return [
            'percentage' => $previous === 0 ? ($current === 0 ? 0.0 : null) : round((($current - $previous) / abs($previous)) * 100, 1),
            'direction' => $current <=> $previous,
            'label' => $label,
        ];
    }

    private function formatRupiah(int $value): string
    {
        return ($value < 0 ? '-Rp ' : 'Rp ').number_format(abs($value), 0, ',', '.');
    }
}
