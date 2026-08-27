<?php

namespace App\Http\Controllers\Tenant\Reports;

use App\Enums\StockMovementType;
use App\Enums\TransactionStatus;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\RawMaterial;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Models\TransactionItem;
use App\Services\SupplierPayableAgingService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PurchaseReportController extends Controller
{
    public function index(Request $request, SupplierPayableAgingService $aging): Response
    {
        $tenantId = $request->user()->tenant_id;
        $filters = $this->filters($request, $tenantId);
        $data = $this->reportData($tenantId, $filters, $aging, true);

        return Inertia::render('Tenant/Reports/Purchases/Index', [
            ...$data,
            'filters' => $filters,
            'suppliers' => Supplier::query()->where('tenant_id', $tenantId)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function export(Request $request, SupplierPayableAgingService $aging): StreamedResponse
    {
        $tenantId = $request->user()->tenant_id;
        $filters = $this->filters($request, $tenantId);
        $section = $request->validate([
            'section' => ['required', Rule::in(['suppliers', 'items', 'price_history', 'valuation', 'hpp', 'aging'])],
        ])['section'];
        $data = $this->reportData($tenantId, $filters, $aging, false);
        [$headers, $rows] = $this->csvRows($section, $data);
        $filename = "laporan-pembelian-{$section}-{$filters['start_date']}-{$filters['end_date']}.csv";

        return response()->streamDownload(function () use ($headers, $rows): void {
            $stream = fopen('php://output', 'w');
            fwrite($stream, "\xEF\xBB\xBF");
            fputcsv($stream, $headers, ';');
            foreach ($rows as $row) {
                fputcsv($stream, $row, ';');
            }
            fclose($stream);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** @return array{start_date: string, end_date: string, supplier_id: string, item_type: string, search: string} */
    private function filters(Request $request, int $tenantId): array
    {
        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'supplier_id' => ['nullable', 'integer', Rule::exists('suppliers', 'id')->where('tenant_id', $tenantId)],
            'item_type' => ['nullable', Rule::in(['product', 'raw_material'])],
            'search' => ['nullable', 'string', 'max:100'],
        ]);
        $start = Carbon::parse($validated['start_date'] ?? now()->startOfMonth()->toDateString())->startOfDay();
        $end = Carbon::parse($validated['end_date'] ?? today()->toDateString())->startOfDay();
        if ($start->greaterThan($end)) {
            [$start, $end] = [$end, $start];
        }
        if ($start->diffInDays($end) > 366) {
            $start = $end->copy()->subDays(366);
        }

        return [
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'supplier_id' => isset($validated['supplier_id']) ? (string) $validated['supplier_id'] : '',
            'item_type' => $validated['item_type'] ?? '',
            'search' => trim($validated['search'] ?? ''),
        ];
    }

    /** @return array<string, mixed> */
    private function reportData(int $tenantId, array $filters, SupplierPayableAgingService $aging, bool $limitHistory): array
    {
        $purchases = $this->periodPurchases($tenantId, $filters)->with('supplier:id,name')->get();
        $payments = SupplierPayment::query()
            ->where('tenant_id', $tenantId)->where('status', 'valid')
            ->whereDate('payment_date', '>=', $filters['start_date'])
            ->whereDate('payment_date', '<=', $filters['end_date'])
            ->when($filters['supplier_id'], fn (Builder $query, string $supplierId) => $query->where('supplier_id', $supplierId))
            ->get(['id', 'supplier_id', 'amount']);
        $payables = Purchase::query()->where('tenant_id', $tenantId)->where('document_status', 'posted')->where('balance_amount', '>', 0)
            ->when($filters['supplier_id'], fn (Builder $query, string $supplierId) => $query->where('supplier_id', $supplierId));

        $items = PurchaseItem::query()
            ->with(['purchase:id,supplier_id,number,purchase_date', 'purchase.supplier:id,name'])
            ->where('tenant_id', $tenantId)
            ->whereHas('purchase', fn (Builder $query) => $this->applyPurchaseFilters($query, $filters))
            ->when($filters['item_type'], fn (Builder $query, string $type) => $query->where('purchasable_type', $type === 'product' ? (new Product)->getMorphClass() : (new RawMaterial)->getMorphClass()))
            ->when($filters['search'], fn (Builder $query, string $search) => $query->where('item_name', 'like', "%{$search}%"))
            ->get();

        $itemBreakdown = $items->groupBy(fn (PurchaseItem $item) => $item->purchasable_type.'|'.$item->purchasable_id.'|'.$item->item_name)
            ->map(function (Collection $group): array {
                $first = $group->first();
                $quantity = (float) $group->sum('quantity');
                $cost = (int) $group->sum('inventory_cost_total');

                return [
                    'item_name' => $first->item_name,
                    'item_type' => $first->purchasable_type === (new Product)->getMorphClass() ? 'product' : 'raw_material',
                    'unit_name' => $first->unit_name,
                    'quantity' => $quantity,
                    'purchase_count' => $group->pluck('purchase_id')->unique()->count(),
                    'total_cost' => $cost,
                    'average_unit_cost' => $quantity > 0 ? round($cost / $quantity, 2) : 0,
                ];
            })->sortByDesc('total_cost')->values();

        $priceHistory = $items->sortByDesc(fn (PurchaseItem $item) => $item->purchase->purchase_date->format('Y-m-d').str_pad((string) $item->id, 10, '0', STR_PAD_LEFT))
            ->map(fn (PurchaseItem $item) => [
                'id' => $item->id,
                'purchase_id' => $item->purchase_id,
                'purchase_number' => $item->purchase->number,
                'purchase_date' => $item->purchase->purchase_date->toDateString(),
                'supplier_name' => $item->purchase->supplier->name,
                'item_name' => $item->item_name,
                'item_type' => $item->purchasable_type === (new Product)->getMorphClass() ? 'product' : 'raw_material',
                'quantity' => (float) $item->quantity,
                'unit_name' => $item->unit_name,
                'unit_cost' => (float) $item->unit_cost,
                'net_unit_cost' => (float) $item->inventory_unit_cost,
            ])->values();
        if ($limitHistory) {
            $priceHistory = $priceHistory->take(100)->values();
        }

        $supplierBreakdown = $purchases->groupBy('supplier_id')->map(function (Collection $group) use ($payments): array {
            $supplier = $group->first()->supplier;

            return [
                'supplier_id' => $supplier->id,
                'supplier_name' => $supplier->name,
                'purchase_count' => $group->count(),
                'purchase_total' => (int) $group->sum('total_amount'),
                'paid_on_purchases' => (int) $group->sum('paid_amount'),
                'period_payments' => (int) $payments->where('supplier_id', $supplier->id)->sum('amount'),
                'outstanding' => (int) $group->sum('balance_amount'),
            ];
        })->sortByDesc('purchase_total')->values();

        $valuation = $this->valuation($tenantId, $filters);
        $hpp = $this->actualHpp($tenantId, $filters, $limitHistory);

        return [
            'periodLabel' => Carbon::parse($filters['start_date'])->translatedFormat('d M Y').' – '.Carbon::parse($filters['end_date'])->translatedFormat('d M Y'),
            'summary' => [
                'purchase_count' => $purchases->count(),
                'purchase_total' => (int) $purchases->sum('total_amount'),
                'supplier_payments' => (int) $payments->sum('amount'),
                'running_payable' => (int) (clone $payables)->sum('balance_amount'),
                'inventory_value' => $valuation['summary']['total'],
                'actual_hpp' => $hpp['summary']['cost'],
            ],
            'aging' => $aging->summarize($payables),
            'supplierBreakdown' => $supplierBreakdown,
            'itemBreakdown' => $itemBreakdown,
            'priceHistory' => $priceHistory,
            'valuation' => $valuation,
            'hpp' => $hpp,
        ];
    }

    private function periodPurchases(int $tenantId, array $filters): Builder
    {
        return Purchase::query()->where('tenant_id', $tenantId)->tap(fn (Builder $query) => $this->applyPurchaseFilters($query, $filters));
    }

    private function applyPurchaseFilters(Builder $query, array $filters): Builder
    {
        return $query->where('document_status', 'posted')
            ->whereDate('purchase_date', '>=', $filters['start_date'])
            ->whereDate('purchase_date', '<=', $filters['end_date'])
            ->when($filters['supplier_id'], fn (Builder $query, string $supplierId) => $query->where('supplier_id', $supplierId));
    }

    /** @return array{summary: array{products: int, raw_materials: int, total: int}, rows: Collection<int, array<string, mixed>>} */
    private function valuation(int $tenantId, array $filters): array
    {
        $rows = collect();
        if ($filters['item_type'] !== 'raw_material') {
            $rows = $rows->concat(Product::query()->where('tenant_id', $tenantId)->where('track_stock', true)
                ->when($filters['search'], fn (Builder $query, string $search) => $query->where('name', 'like', "%{$search}%"))
                ->get(['id', 'name', 'stock', 'cost', 'is_active'])->map(fn (Product $product) => [
                    'id' => 'product-'.$product->id, 'item_type' => 'product', 'item_name' => $product->name,
                    'unit_name' => 'pcs', 'stock' => (float) $product->stock, 'average_cost' => (float) $product->cost,
                    'value' => (int) round((float) $product->stock * (float) $product->cost), 'is_active' => $product->is_active,
                ]));
        }
        if ($filters['item_type'] !== 'product') {
            $rows = $rows->concat(RawMaterial::query()->where('tenant_id', $tenantId)
                ->when($filters['search'], fn (Builder $query, string $search) => $query->where('name', 'like', "%{$search}%"))
                ->get(['id', 'name', 'unit', 'stock', 'average_cost', 'is_active'])->map(fn (RawMaterial $material) => [
                    'id' => 'raw-'.$material->id, 'item_type' => 'raw_material', 'item_name' => $material->name,
                    'unit_name' => $material->unit, 'stock' => (float) $material->stock, 'average_cost' => (float) $material->average_cost,
                    'value' => (int) round((float) $material->stock * (float) $material->average_cost), 'is_active' => $material->is_active,
                ]));
        }
        $rows = $rows->sortByDesc('value')->values();

        return [
            'summary' => [
                'products' => (int) $rows->where('item_type', 'product')->sum('value'),
                'raw_materials' => (int) $rows->where('item_type', 'raw_material')->sum('value'),
                'total' => (int) $rows->sum('value'),
            ],
            'rows' => $rows,
        ];
    }

    /** @return array{summary: array{revenue: int, cost: int, gross_profit: int}, rows: Collection<int, array<string, mixed>>} */
    private function actualHpp(int $tenantId, array $filters, bool $limit): array
    {
        $items = TransactionItem::query()
            ->with('transaction:id,invoice_number,created_at')
            ->whereHas('transaction', fn (Builder $query) => $query
                ->where('tenant_id', $tenantId)->where('status', TransactionStatus::Completed->value)
                ->whereDate('created_at', '>=', $filters['start_date'])->whereDate('created_at', '<=', $filters['end_date']))
            ->when($filters['search'], fn (Builder $query, string $search) => $query->where('product_name', 'like', "%{$search}%"))
            ->get();
        $movementCosts = StockMovement::query()
            ->where('tenant_id', $tenantId)->where('type', StockMovementType::Sale->value)
            ->where('reference_type', (new TransactionItem)->getMorphClass())->whereIn('reference_id', $items->pluck('id'))
            ->selectRaw('reference_id, SUM(total_cost_snapshot) as cost')->groupBy('reference_id')->pluck('cost', 'reference_id');
        $rows = $items->map(function (TransactionItem $item) use ($movementCosts): array {
            $cost = (float) ($movementCosts->get($item->id) ?? $item->total_cost_snapshot);

            return [
                'id' => $item->id,
                'transaction_id' => $item->transaction_id,
                'invoice_number' => $item->transaction->invoice_number,
                'transaction_date' => $item->transaction->created_at->toDateString(),
                'item_name' => $item->product_name,
                'quantity' => (float) $item->quantity,
                'revenue' => (int) $item->subtotal,
                'actual_cost' => (int) round($cost),
                'gross_profit' => (int) round((float) $item->subtotal - $cost),
            ];
        })->sortByDesc(fn (array $row) => $row['transaction_date'].str_pad((string) $row['id'], 10, '0', STR_PAD_LEFT))->values();
        $summary = [
            'revenue' => (int) $rows->sum('revenue'),
            'cost' => (int) $rows->sum('actual_cost'),
            'gross_profit' => (int) $rows->sum('gross_profit'),
        ];

        return ['summary' => $summary, 'rows' => $limit ? $rows->take(100)->values() : $rows];
    }

    /** @return array{array<int, string>, Collection<int, array<int, mixed>>|array<int, array<int, mixed>>} */
    private function csvRows(string $section, array $data): array
    {
        return match ($section) {
            'suppliers' => [['Supplier', 'Jumlah Pembelian', 'Total Pembelian', 'Pembayaran Periode', 'Sisa Hutang'], $data['supplierBreakdown']->map(fn (array $row) => [$row['supplier_name'], $row['purchase_count'], $row['purchase_total'], $row['period_payments'], $row['outstanding']])],
            'items' => [['Barang', 'Jenis', 'Satuan', 'Jumlah Dibeli', 'Jumlah Dokumen', 'Rata-rata Biaya', 'Total Biaya'], $data['itemBreakdown']->map(fn (array $row) => [$row['item_name'], $row['item_type'], $row['unit_name'], $row['quantity'], $row['purchase_count'], $row['average_unit_cost'], $row['total_cost']])],
            'price_history' => [['Tanggal', 'Pembelian', 'Supplier', 'Barang', 'Jenis', 'Kuantitas', 'Satuan', 'Harga Faktur', 'Biaya Bersih'], $data['priceHistory']->map(fn (array $row) => [$row['purchase_date'], $row['purchase_number'], $row['supplier_name'], $row['item_name'], $row['item_type'], $row['quantity'], $row['unit_name'], $row['unit_cost'], $row['net_unit_cost']])],
            'valuation' => [['Barang', 'Jenis', 'Satuan', 'Stok', 'HPP Rata-rata', 'Nilai Persediaan'], $data['valuation']['rows']->map(fn (array $row) => [$row['item_name'], $row['item_type'], $row['unit_name'], $row['stock'], $row['average_cost'], $row['value']])],
            'hpp' => [['Tanggal', 'Invoice', 'Barang', 'Kuantitas', 'Pendapatan', 'HPP Aktual', 'Laba Kotor'], $data['hpp']['rows']->map(fn (array $row) => [$row['transaction_date'], $row['invoice_number'], $row['item_name'], $row['quantity'], $row['revenue'], $row['actual_cost'], $row['gross_profit']])],
            default => [['Kelompok Umur', 'Jumlah Dokumen', 'Nilai Hutang'], collect([
                ['Belum jatuh tempo', $data['aging']['not_due']['count'], $data['aging']['not_due']['amount']],
                ['Terlambat 1-7 hari', $data['aging']['overdue_1_7']['count'], $data['aging']['overdue_1_7']['amount']],
                ['Terlambat 8-30 hari', $data['aging']['overdue_8_30']['count'], $data['aging']['overdue_8_30']['amount']],
                ['Terlambat >30 hari', $data['aging']['overdue_over_30']['count'], $data['aging']['overdue_over_30']['amount']],
            ])],
        };
    }
}
