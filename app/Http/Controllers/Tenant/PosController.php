<?php

namespace App\Http\Controllers\Tenant;

use App\Enums\PaymentMethod;
use App\Enums\StockMovementType;
use App\Enums\TransactionStatus;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\Shift;
use App\Models\Transaction;
use App\Services\StockMovementService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    public function index(Request $request): Response
    {
        $tenantId = $request->user()->tenant_id;

        $activeShift = Shift::where('tenant_id', $tenantId)
            ->whereNull('closed_at')
            ->with('user:id,name')
            ->first();

        $heldTransactions = [];
        $shiftSummary = null;

        if ($activeShift) {
            $heldTransactions = Transaction::where('tenant_id', $tenantId)
                ->where('shift_id', $activeShift->id)
                ->where('status', TransactionStatus::Held)
                ->with('items')
                ->latest()
                ->get();

            $completed = Transaction::where('shift_id', $activeShift->id)
                ->where('status', TransactionStatus::Completed);

            $transactionCount = (clone $completed)->count();
            $cashSales = (int) (clone $completed)->where('payment_method', PaymentMethod::Cash)->sum('total');
            $qrisSales = (int) (clone $completed)->where('payment_method', PaymentMethod::Qris)->sum('total');

            $shiftSummary = [
                'transaction_count' => $transactionCount,
                'cash_sales' => $cashSales,
                'qris_sales' => $qrisSales,
                'total_sales' => $cashSales + $qrisSales,
                'expected_cash' => $activeShift->opening_cash + $cashSales,
            ];
        }

        $tenant = $request->user()->tenant;

        $products = Product::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->with(['category:id,name', 'rawMaterials:id,name,stock'])
            ->orderBy('name')
            ->get();

        $products->each(function (Product $product) {
            $limits = collect();

            if ($product->track_stock) {
                $limits->push((int) $product->stock);
            }

            foreach ($product->rawMaterials as $rawMaterial) {
                $recipeQuantity = (float) $rawMaterial->pivot->quantity;

                if ($recipeQuantity > 0) {
                    $limits->push((int) floor(((float) $rawMaterial->stock + 0.000001) / $recipeQuantity));
                }
            }

            $product->setAttribute('available_quantity', $limits->isEmpty() ? null : max(0, $limits->min()));
            $product->unsetRelation('rawMaterials');
        });

        return Inertia::render('Tenant/Pos/Index', [
            'activeShift' => $activeShift,
            'products' => $products,
            'categories' => $tenant->categories()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'icon']),
            'heldTransactions' => $heldTransactions,
            'shiftSummary' => $shiftSummary,
            'storeSettings' => [
                'name' => $tenant->name,
                'address' => $tenant->address,
                'phone' => $tenant->phone,
                'logo_url' => $tenant->logo_url,
                'receipt_footer' => $tenant->receipt_footer,
                'tax_percentage' => (float) $tenant->tax_percentage,
                'service_charge_percentage' => (float) $tenant->service_charge_percentage,
            ],
        ]);
    }

    public function checkout(Request $request): RedirectResponse
    {
        $data = $this->validatedSale($request);

        $transaction = $this->createSale($request, $data, TransactionStatus::Completed);

        return redirect()->route('tenant.pos.index')->with('success', "Transaksi {$transaction->invoice_number} berhasil.");
    }

    public function hold(Request $request): RedirectResponse
    {
        $data = $this->validatedSale($request);

        $this->createSale($request, $data, TransactionStatus::Held);

        return redirect()->route('tenant.pos.index')->with('success', 'Transaksi ditahan.');
    }

    public function destroyHeld(Request $request, Transaction $transaction): RedirectResponse
    {
        abort_unless($transaction->tenant_id === $request->user()->tenant_id, 403);
        abort_unless($transaction->status === TransactionStatus::Held, 403);

        $transaction->delete();

        return redirect()->route('tenant.pos.index');
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedSale(Request $request): array
    {
        $tenantId = $request->user()->tenant_id;

        return $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => [
                'required',
                'distinct',
                Rule::exists('products', 'id')->where('tenant_id', $tenantId),
            ],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.note' => ['nullable', 'string', 'max:255'],
            'payment_method' => ['required', Rule::in(['cash', 'qris'])],
            'additional_fee' => ['nullable', 'integer', 'min:0'],
            'amount_received' => ['nullable', 'integer', 'min:0'],
        ]);
    }

    private function createSale(Request $request, array $data, TransactionStatus $status): Transaction
    {
        $tenantId = $request->user()->tenant_id;

        return DB::transaction(function () use ($request, $data, $status, $tenantId) {
            $activeShift = Shift::where('tenant_id', $tenantId)
                ->whereNull('closed_at')
                ->lockForUpdate()
                ->first();

            if (! $activeShift) {
                throw ValidationException::withMessages(['items' => 'Shift belum dibuka.']);
            }

            $productIds = collect($data['items'])->pluck('product_id')->unique();

            $products = Product::where('tenant_id', $tenantId)
                ->whereIn('id', $productIds)
                ->orderBy('id')
                ->when($status === TransactionStatus::Completed, fn ($query) => $query->lockForUpdate())
                ->with('rawMaterials')
                ->get()
                ->keyBy('id');

            $rawMaterialRequirements = collect();

            if ($status === TransactionStatus::Completed) {
                foreach ($data['items'] as $item) {
                    $product = $products->get($item['product_id']);

                    foreach ($product->rawMaterials as $rawMaterial) {
                        $required = (float) $rawMaterial->pivot->quantity * (int) $item['quantity'];
                        $rawMaterialRequirements[$rawMaterial->id] = ($rawMaterialRequirements[$rawMaterial->id] ?? 0) + $required;
                    }
                }
            }

            $rawMaterials = RawMaterial::query()
                ->where('tenant_id', $tenantId)
                ->whereIn('id', $rawMaterialRequirements->keys())
                ->orderBy('id')
                ->when($status === TransactionStatus::Completed, fn ($query) => $query->lockForUpdate())
                ->get()
                ->keyBy('id');

            $subtotal = 0;
            $itemsToInsert = [];

            foreach ($data['items'] as $item) {
                $product = $products->get($item['product_id']);
                $quantity = (int) $item['quantity'];

                if ($status === TransactionStatus::Completed && $product->track_stock && $product->stock < $quantity) {
                    throw ValidationException::withMessages([
                        'items' => "Stok {$product->name} tidak cukup (tersisa {$product->stock}).",
                    ]);
                }

                $lineSubtotal = $product->price * $quantity;
                $subtotal += $lineSubtotal;

                $itemsToInsert[] = [
                    'product' => $product,
                    'quantity' => $quantity,
                    'note' => $item['note'] ?? null,
                    'subtotal' => $lineSubtotal,
                ];
            }

            foreach ($rawMaterialRequirements as $rawMaterialId => $required) {
                $rawMaterial = $rawMaterials->get($rawMaterialId);

                if (! $rawMaterial || (float) $rawMaterial->stock + 0.000001 < $required) {
                    $name = $rawMaterial?->name ?? 'bahan baku';
                    $available = $rawMaterial?->stock ?? 0;

                    throw ValidationException::withMessages([
                        'items' => "Stok bahan baku {$name} tidak cukup (butuh {$required}, tersisa {$available}).",
                    ]);
                }
            }

            $tenant = $request->user()->tenant;
            $taxAmount = (int) round($subtotal * ((float) $tenant->tax_percentage / 100));
            $serviceChargeAmount = (int) round($subtotal * ((float) $tenant->service_charge_percentage / 100));

            $additionalFee = $data['additional_fee'] ?? 0;
            $total = $subtotal + $taxAmount + $serviceChargeAmount + $additionalFee;
            $amountReceived = $data['amount_received'] ?? null;
            $isCashPayment = $data['payment_method'] === PaymentMethod::Cash->value;

            if ($status === TransactionStatus::Completed && $isCashPayment && $amountReceived === null) {
                throw ValidationException::withMessages([
                    'amount_received' => 'Jumlah uang yang diterima wajib diisi untuk pembayaran tunai.',
                ]);
            }

            if ($status === TransactionStatus::Completed && $isCashPayment && $amountReceived < $total) {
                $shortfall = $total - $amountReceived;

                throw ValidationException::withMessages([
                    'amount_received' => 'Uang yang diterima kurang Rp '.number_format($shortfall, 0, ',', '.').'.',
                ]);
            }

            if (! $isCashPayment) {
                $amountReceived = null;
            }

            $changeAmount = $isCashPayment && $amountReceived !== null
                ? $amountReceived - $total
                : null;

            $invoiceNumber = $status === TransactionStatus::Completed
                ? $this->generateInvoiceNumber($tenantId)
                : null;

            $transaction = Transaction::create([
                'tenant_id' => $tenantId,
                'shift_id' => $activeShift->id,
                'user_id' => $request->user()->id,
                'invoice_number' => $invoiceNumber,
                'status' => $status,
                'payment_method' => $data['payment_method'],
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'service_charge_amount' => $serviceChargeAmount,
                'additional_fee' => $additionalFee,
                'total' => $total,
                'amount_received' => $amountReceived,
                'change_amount' => $changeAmount,
            ]);

            foreach ($itemsToInsert as $entry) {
                $product = $entry['product'];

                $transaction->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'unit_price' => $product->price,
                    'quantity' => $entry['quantity'],
                    'note' => $entry['note'],
                    'subtotal' => $entry['subtotal'],
                ]);

                if ($status === TransactionStatus::Completed) {
                    if ($product->track_stock) {
                        StockMovementService::record(
                            $product,
                            StockMovementType::Sale,
                            -$entry['quantity'],
                            "Terjual di transaksi {$invoiceNumber}",
                            $request->user()->id,
                        );
                    }

                    foreach ($product->rawMaterials as $rawMaterial) {
                        $consumed = $rawMaterial->pivot->quantity * $entry['quantity'];
                        StockMovementService::record(
                            $rawMaterials->get($rawMaterial->id),
                            StockMovementType::Sale,
                            -$consumed,
                            "Terjual di transaksi {$invoiceNumber}",
                            $request->user()->id,
                        );
                    }
                }
            }

            return $transaction;
        });
    }

    private function generateInvoiceNumber(int $tenantId): string
    {
        $today = now()->format('Ymd');

        $sequence = Transaction::where('tenant_id', $tenantId)
            ->whereNotNull('invoice_number')
            ->whereDate('created_at', now()->toDateString())
            ->count() + 1;

        return "TRX{$today}-".str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }
}
