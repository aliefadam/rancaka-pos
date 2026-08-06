<?php

namespace App\Http\Controllers\Tenant;

use App\Enums\PaymentMethod;
use App\Enums\StockMovementType;
use App\Enums\TransactionStatus;
use App\Http\Controllers\Controller;
use App\Models\Product;
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
                'opening_cash' => $activeShift->opening_cash,
                'cash_sales' => $cashSales,
                'qris_sales' => $qrisSales,
                'total_sales' => $cashSales + $qrisSales,
                'expected_cash' => $activeShift->opening_cash + $cashSales,
            ];
        }

        return Inertia::render('Tenant/Pos/Index', [
            'activeShift' => $activeShift,
            'products' => Product::where('tenant_id', $tenantId)
                ->where('is_active', true)
                ->with('category:id,name')
                ->orderBy('name')
                ->get(),
            'categories' => $request->user()->tenant->categories()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'icon']),
            'heldTransactions' => $heldTransactions,
            'shiftSummary' => $shiftSummary,
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
                ->when($status === TransactionStatus::Completed, fn ($query) => $query->lockForUpdate())
                ->with('rawMaterials')
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

            $additionalFee = $data['additional_fee'] ?? 0;
            $total = $subtotal + $additionalFee;
            $amountReceived = $data['amount_received'] ?? null;
            $changeAmount = $amountReceived !== null ? max(0, $amountReceived - $total) : null;

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
                            $rawMaterial,
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
