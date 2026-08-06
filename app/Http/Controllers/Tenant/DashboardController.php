<?php

namespace App\Http\Controllers\Tenant;

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

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        Carbon::setLocale('id');

        $tenantId = $request->user()->tenant_id;
        $todayStart = Carbon::today();
        $todayEnd = Carbon::tomorrow();
        $weekStart = Carbon::today()->subDays(6);

        $todayTransactions = Transaction::query()
            ->where('tenant_id', $tenantId)
            ->where('status', TransactionStatus::Completed)
            ->where('created_at', '>=', $todayStart)
            ->where('created_at', '<', $todayEnd);

        $todayRevenue = (int) (clone $todayTransactions)->sum('total');
        $todayTransactionCount = (clone $todayTransactions)->count();
        $todayProductsSold = (int) TransactionItem::query()
            ->whereHas('transaction', fn ($query) => $query
                ->where('tenant_id', $tenantId)
                ->where('status', TransactionStatus::Completed)
                ->where('created_at', '>=', $todayStart)
                ->where('created_at', '<', $todayEnd))
            ->sum('quantity');

        $lowStockProducts = Product::query()
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->where('track_stock', true)
            ->where('stock', '<=', 5)
            ->count();

        $todayExpenses = (int) Expense::query()
            ->where('tenant_id', $tenantId)
            ->where('expense_date', '>=', $todayStart)
            ->where('expense_date', '<', $todayEnd)
            ->sum('amount');

        $salesByDate = Transaction::query()
            ->where('tenant_id', $tenantId)
            ->where('status', TransactionStatus::Completed)
            ->where('created_at', '>=', $weekStart)
            ->where('created_at', '<', $todayEnd)
            ->get(['total', 'created_at'])
            ->groupBy(fn (Transaction $transaction) => $transaction->created_at->toDateString())
            ->map(fn (Collection $transactions) => (int) $transactions->sum('total'));

        $weeklySales = collect(range(0, 6))
            ->map(function (int $offset) use ($weekStart, $salesByDate): array {
                $date = $weekStart->copy()->addDays($offset);

                return [
                    'day' => $date->translatedFormat('D'),
                    'date' => $date->translatedFormat('d M'),
                    'value' => $salesByDate->get($date->toDateString(), 0),
                ];
            })
            ->values();

        $topProducts = TransactionItem::query()
            ->selectRaw('transaction_items.product_id, transaction_items.product_name, SUM(transaction_items.quantity) as sold, SUM(transaction_items.subtotal) as revenue')
            ->join('transactions', 'transactions.id', '=', 'transaction_items.transaction_id')
            ->where('transactions.tenant_id', $tenantId)
            ->where('transactions.status', TransactionStatus::Completed->value)
            ->where('transactions.created_at', '>=', $weekStart)
            ->where('transactions.created_at', '<', $todayEnd)
            ->groupBy('transaction_items.product_id', 'transaction_items.product_name')
            ->orderByDesc('sold')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get()
            ->map(fn (TransactionItem $item): array => [
                'name' => $item->product_name,
                'sold' => (int) $item->sold,
                'revenue' => $this->formatRupiah((int) $item->revenue),
            ]);

        return Inertia::render('Tenant/Dashboard', [
            'greetingName' => $request->user()->name,
            'period' => sprintf(
                '%s, %s',
                $todayStart->translatedFormat('l'),
                $todayStart->translatedFormat('d F Y'),
            ),
            'overview' => [
                ['key' => 'omset', 'label' => 'Omset Hari Ini', 'value' => $this->formatRupiah($todayRevenue), 'icon' => 'fi-rr-chart-histogram', 'tone' => 'indigo'],
                ['key' => 'transaksi', 'label' => 'Transaksi Selesai', 'value' => number_format($todayTransactionCount, 0, ',', '.'), 'icon' => 'fi-rr-receipt', 'tone' => 'blue'],
                ['key' => 'produk_terjual', 'label' => 'Produk Terjual', 'value' => number_format($todayProductsSold, 0, ',', '.'), 'icon' => 'fi-rr-shopping-bag', 'tone' => 'emerald'],
                ['key' => 'produk_hampir_habis', 'label' => 'Stok Menipis', 'value' => number_format($lowStockProducts, 0, ',', '.'), 'icon' => 'fi-rr-triangle-warning', 'tone' => 'amber'],
                ['key' => 'pengeluaran', 'label' => 'Pengeluaran Hari Ini', 'value' => $this->formatRupiah($todayExpenses), 'icon' => 'fi-rr-money-bill-wave', 'tone' => 'rose'],
            ],
            'weeklySales' => $weeklySales,
            'topProducts' => $topProducts,
        ]);
    }

    private function formatRupiah(int $value): string
    {
        return 'Rp '.number_format($value, 0, ',', '.');
    }
}
