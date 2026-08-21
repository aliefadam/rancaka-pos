<?php

namespace App\Http\Controllers\Tenant;

use App\Enums\PaymentMethod;
use App\Enums\StockMovementType;
use App\Enums\TransactionStatus;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\CreditCustomer;
use App\Models\RawMaterial;
use App\Models\Shift;
use App\Models\Transaction;
use App\Services\StockMovementService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
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
        $heldTransactionCount = 0;
        $shiftSummary = null;

        if ($activeShift) {
            $heldTransactionCount = Transaction::where('tenant_id', $tenantId)
                ->where('status', TransactionStatus::Held)
                ->count();

            $heldTransactions = Transaction::where('tenant_id', $tenantId)
                ->where('status', TransactionStatus::Held)
                ->when(
                    $request->user()->hasRestrictedCashierAccess(),
                    fn ($query) => $query->where('user_id', $request->user()->id),
                )
                ->with('items')
                ->latest()
                ->get();

            if ($request->user()->hasPermission('financial-reports.view')) {
                $completed = Transaction::where('shift_id', $activeShift->id)
                    ->where('status', TransactionStatus::Completed);

                $transactionCount = (clone $completed)->count();
                $cashSales = (int) (clone $completed)->where('payment_method', PaymentMethod::Cash)->sum('total');
                $qrisSales = (int) (clone $completed)->where('payment_method', PaymentMethod::Qris)->sum('total');

                $shiftSummary = [
                    'transaction_count' => $transactionCount,
                    'opening_cash' => $activeShift->opening_cash,
                    'cash_sales' => $cashSales,
                    'qris_sales' => $qrisSales,
                    'total_sales' => $cashSales + $qrisSales,
                    'expected_cash' => $activeShift->opening_cash + $cashSales,
                ];
            }
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
            'heldTransactionCount' => $heldTransactionCount,
            'shiftSummary' => $shiftSummary,
            'storeSettings' => [
                'name' => $tenant->name,
                'address' => $tenant->address,
                'phone' => $tenant->phone,
                'logo_url' => $tenant->logo_url,
                'receipt_footer' => $tenant->receipt_footer,
                'receipt_size' => $tenant->receipt_size ?? '58mm',
                'auto_print_receipt' => (bool) ($tenant->auto_print_receipt ?? false),
                'tax_percentage' => (float) $tenant->tax_percentage,
                'service_charge_percentage' => (float) $tenant->service_charge_percentage,
            ],
            'creditCustomers' => CreditCustomer::where('tenant_id', $tenantId)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function checkout(Request $request): RedirectResponse
    {
        $data = $this->validatedSale($request);

        $transaction = $this->createSale($request, $data, TransactionStatus::Completed);

        return redirect()->route('tenant.pos.index')->with([
            'success' => "Transaksi {$transaction->invoice_number} berhasil.",
            'transaction_id' => $transaction->id,
            'receipt_url' => route('tenant.transactions.receipt', $transaction),
            'bridge_receipt_url' => URL::temporarySignedRoute(
                'bridge.receipts.show',
                now()->addMinutes(30),
                $transaction,
            ),
        ]);
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
            'items.*.discount_type' => ['nullable', Rule::in(['fixed', 'percentage'])],
            'items.*.discount_value' => ['nullable', 'integer', 'min:0'],
            'payment_method' => ['required', Rule::in(['cash', 'qris', 'credit'])],
            'credit_customer_id' => ['nullable', Rule::exists('credit_customers', 'id')->where('tenant_id', $tenantId)],
            'credit_customer_name' => ['nullable', 'string', 'max:120', 'required_if:payment_method,credit'],
            'credit_initial_payment' => ['nullable', 'integer', 'min:0'],
            'discount_type' => ['nullable', Rule::in(['fixed', 'percentage'])],
            'discount_value' => ['nullable', 'integer', 'min:0'],
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

                $lineGross = $product->price * $quantity;
                $itemDiscountType = $item['discount_type'] ?? null;
                $itemDiscountValue = (int) ($item['discount_value'] ?? 0);

                if ($itemDiscountValue > 0 && $itemDiscountType === null) {
                    throw ValidationException::withMessages([
                        'items' => "Jenis diskon untuk {$product->name} wajib dipilih.",
                    ]);
                }

                if ($itemDiscountType === 'percentage' && $itemDiscountValue > 100) {
                    throw ValidationException::withMessages([
                        'items' => "Diskon {$product->name} maksimal 100%.",
                    ]);
                }

                $itemDiscountAmount = match ($itemDiscountType) {
                    'percentage' => (int) round($lineGross * ($itemDiscountValue / 100)),
                    'fixed' => $itemDiscountValue,
                    default => 0,
                };

                if ($itemDiscountAmount > $lineGross) {
                    throw ValidationException::withMessages([
                        'items' => "Diskon {$product->name} tidak boleh melebihi total item.",
                    ]);
                }

                $lineSubtotal = $lineGross - $itemDiscountAmount;
                $subtotal += $lineSubtotal;

                $itemsToInsert[] = [
                    'product' => $product,
                    'quantity' => $quantity,
                    'note' => $item['note'] ?? null,
                    'discount_type' => $itemDiscountAmount > 0 ? $itemDiscountType : null,
                    'discount_value' => $itemDiscountAmount > 0 ? $itemDiscountValue : 0,
                    'discount_amount' => $itemDiscountAmount,
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
            $discountType = $data['discount_type'] ?? null;
            $discountValue = (int) ($data['discount_value'] ?? 0);

            if ($discountValue > 0 && $discountType === null) {
                throw ValidationException::withMessages([
                    'discount_type' => 'Jenis diskon wajib dipilih.',
                ]);
            }

            if ($discountType === 'percentage' && $discountValue > 100) {
                throw ValidationException::withMessages([
                    'discount_value' => 'Diskon persentase maksimal 100%.',
                ]);
            }

            $discountAmount = match ($discountType) {
                'percentage' => (int) round($subtotal * ($discountValue / 100)),
                'fixed' => $discountValue,
                default => 0,
            };

            if ($discountAmount > $subtotal) {
                throw ValidationException::withMessages([
                    'discount_value' => 'Diskon tidak boleh melebihi subtotal.',
                ]);
            }

            $netSubtotal = $subtotal - $discountAmount;
            $taxAmount = (int) round($netSubtotal * ((float) $tenant->tax_percentage / 100));
            $serviceChargeAmount = (int) round($netSubtotal * ((float) $tenant->service_charge_percentage / 100));

            $additionalFee = $data['additional_fee'] ?? 0;
            $total = $netSubtotal + $taxAmount + $serviceChargeAmount + $additionalFee;
            $amountReceived = $data['amount_received'] ?? null;
            $isCashPayment = $data['payment_method'] === PaymentMethod::Cash->value;
            $isCreditPayment = $data['payment_method'] === PaymentMethod::Credit->value;

            if ($status === TransactionStatus::Completed && $isCreditPayment && (int) ($data['credit_initial_payment'] ?? 0) > $total) {
                throw ValidationException::withMessages(['credit_initial_payment' => 'Pembayaran awal tidak boleh melebihi total transaksi.']);
            }

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
                'discount_type' => $discountAmount > 0 ? $discountType : null,
                'discount_value' => $discountAmount > 0 ? $discountValue : 0,
                'discount_amount' => $discountAmount,
                'tax_amount' => $taxAmount,
                'service_charge_amount' => $serviceChargeAmount,
                'additional_fee' => $additionalFee,
                'total' => $total,
                'amount_received' => $amountReceived,
                'change_amount' => $changeAmount,
            ]);

            if ($status === TransactionStatus::Completed && $isCreditPayment) {
                $customer = ! empty($data['credit_customer_id'])
                    ? CreditCustomer::where('tenant_id', $tenantId)->findOrFail($data['credit_customer_id'])
                    : CreditCustomer::firstOrCreate(['tenant_id' => $tenantId, 'name' => trim($data['credit_customer_name'] ?? '')]);
                $initialPayment = min((int) ($data['credit_initial_payment'] ?? 0), $total);
                $creditSale = $transaction->creditSale()->create([
                    'tenant_id' => $tenantId, 'credit_customer_id' => $customer->id,
                    'total_amount' => $total, 'paid_amount' => $initialPayment,
                    'status' => $initialPayment >= $total ? 'paid' : 'outstanding',
                ]);
                if ($initialPayment > 0) $creditSale->payments()->create([
                    'tenant_id' => $tenantId, 'user_id' => $request->user()->id,
                    'amount' => $initialPayment, 'note' => 'Pembayaran awal saat transaksi',
                ]);
            }

            foreach ($itemsToInsert as $entry) {
                $product = $entry['product'];

                $transaction->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'unit_price' => $product->price,
                    'quantity' => $entry['quantity'],
                    'note' => $entry['note'],
                    'discount_type' => $entry['discount_type'],
                    'discount_value' => $entry['discount_value'],
                    'discount_amount' => $entry['discount_amount'],
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
