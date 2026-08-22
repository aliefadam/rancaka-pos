<?php

namespace App\Services;

use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\RawMaterial;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PurchaseService
{
    public function __construct(private readonly SupplierPaymentService $payments) {}

    public function create(User $actor, array $data, ?string $invoicePath = null, ?string $paymentProofPath = null): Purchase
    {
        return DB::transaction(function () use ($actor, $data, $invoicePath, $paymentProofPath) {
            $supplier = Supplier::query()->where('tenant_id', $actor->tenant_id)->where('is_active', true)->findOrFail($data['supplier_id']);
            $rows = collect($data['items'])->map(function (array $row) use ($actor) {
                $class = $row['item_type'] === 'product' ? Product::class : RawMaterial::class;
                $item = $class::query()->where('tenant_id', $actor->tenant_id)->where('is_active', true)->lockForUpdate()->findOrFail($row['item_id']);
                if ($item instanceof Product && (! $item->track_stock || (float) $row['quantity'] !== floor((float) $row['quantity']))) {
                    throw ValidationException::withMessages(['items' => 'Produk harus memakai stok dan kuantitasnya berupa bilangan bulat.']);
                }
                if ($item instanceof RawMaterial && (float) $item->stock > 0 && ! $item->opening_cost_confirmed_at) {
                    throw ValidationException::withMessages(['items' => "Tetapkan saldo awal HPP {$item->name} sebelum menerima pembelian baru."]);
                }

                return ['model' => $item, 'quantity' => (float) $row['quantity'], 'unit_cost' => (float) $row['unit_cost'], 'subtotal' => (int) round($row['quantity'] * $row['unit_cost'])];
            });
            if ($rows->map(fn ($row) => $row['model']->getMorphClass().':'.$row['model']->id)->duplicates()->isNotEmpty()) {
                throw ValidationException::withMessages(['items' => 'Barang yang sama tidak boleh dipilih lebih dari sekali.']);
            }

            $subtotal = $rows->sum('subtotal');
            $discount = (int) ($data['discount_amount'] ?? 0);
            $additional = (int) ($data['additional_cost_amount'] ?? 0);
            if ($subtotal < 1 || $discount > $subtotal) {
                throw ValidationException::withMessages(['discount_amount' => 'Diskon tidak boleh melebihi subtotal barang.']);
            }
            $total = $subtotal - $discount + $additional;
            $term = $data['payment_term'];
            $initial = $term === 'paid' ? $total : (int) ($data['initial_payment_amount'] ?? 0);
            if (($term === 'credit' && $initial !== 0) || ($term === 'installment' && ($initial < 1 || $initial >= $total))) {
                throw ValidationException::withMessages(['initial_payment_amount' => 'Pembayaran awal tidak sesuai syarat pembayaran.']);
            }
            $balance = $total - $initial;
            $schedules = $this->schedules($data, $term, $balance);

            $purchase = Purchase::create([
                'tenant_id' => $actor->tenant_id, 'supplier_id' => $supplier->id,
                'number' => 'PUR-'.now()->format('Ymd').'-'.Str::upper(Str::random(6)),
                'supplier_invoice_number' => $data['supplier_invoice_number'] ?? null,
                'purchase_date' => $data['purchase_date'], 'payment_term' => $term,
                'due_date' => $balance > 0 ? collect($schedules)->max('due_date') : null,
                'items_subtotal' => $subtotal, 'discount_amount' => $discount,
                'additional_cost_amount' => $additional, 'additional_cost_note' => $data['additional_cost_note'] ?? null,
                'total_amount' => $total, 'paid_amount' => 0, 'balance_amount' => $total,
                'payment_status' => 'unpaid', 'supplier_invoice_path' => $invoicePath,
                'note' => $data['note'] ?? null, 'created_by' => $actor->id,
            ]);

            $allocatedDiscount = 0;
            $allocatedAdditional = 0;
            foreach ($rows->values() as $index => $row) {
                $last = $index === $rows->count() - 1;
                $itemDiscount = $last ? $discount - $allocatedDiscount : (int) round($discount * $row['subtotal'] / $subtotal);
                $itemAdditional = $last ? $additional - $allocatedAdditional : (int) round($additional * $row['subtotal'] / $subtotal);
                $allocatedDiscount += $itemDiscount;
                $allocatedAdditional += $itemAdditional;
                $inventoryTotal = $row['subtotal'] - $itemDiscount + $itemAdditional;
                $purchaseItem = $purchase->items()->create([
                    'tenant_id' => $actor->tenant_id, 'purchasable_type' => $row['model']->getMorphClass(), 'purchasable_id' => $row['model']->id,
                    'item_name' => $row['model']->name, 'unit_name' => $row['model'] instanceof RawMaterial ? $row['model']->unit : 'pcs',
                    'quantity' => $row['quantity'], 'unit_cost' => $row['unit_cost'], 'subtotal' => $row['subtotal'],
                    'allocated_discount' => $itemDiscount, 'allocated_additional_cost' => $itemAdditional,
                    'inventory_cost_total' => $inventoryTotal, 'inventory_unit_cost' => $inventoryTotal / $row['quantity'],
                ]);
                StockMovementService::record($row['model'], StockMovementType::In, $row['quantity'], "Pembelian {$purchase->number}", $actor->id, ['unit_cost' => $inventoryTotal / $row['quantity'], 'reference' => $purchaseItem]);
            }
            foreach ($schedules as $index => $schedule) {
                $purchase->installments()->create(['tenant_id' => $actor->tenant_id, 'sequence' => $index + 1, 'due_date' => $schedule['due_date'], 'planned_amount' => $schedule['amount']]);
            }
            if ($initial > 0) {
                $this->payments->record($actor, $purchase, [
                    'amount' => $initial, 'payment_date' => $data['purchase_date'],
                    'payment_method' => $data['initial_payment_method'],
                    'reference_number' => $data['initial_reference_number'] ?? null,
                    'note' => 'Pembayaran awal '.$purchase->number,
                    'skip_installment_allocation' => true,
                ], $paymentProofPath);
            }

            return $purchase->fresh(['supplier', 'items.purchasable', 'installments', 'payments']);
        });
    }

    public function void(User $actor, Purchase $purchase, string $reason): void
    {
        DB::transaction(function () use ($actor, $purchase, $reason) {
            abort_unless($actor->isOwner() && $purchase->tenant_id === $actor->tenant_id, 403);
            $purchase = Purchase::query()->with(['items.purchasable', 'items.stockMovements'])->lockForUpdate()->findOrFail($purchase->id);
            if ($purchase->document_status !== 'posted' || $purchase->payments()->where('status', 'valid')->exists()) {
                throw ValidationException::withMessages(['purchase' => 'Batalkan seluruh pembayaran valid sebelum membatalkan pembelian.']);
            }
            foreach ($purchase->items as $item) {
                $movement = $item->stockMovements->sortByDesc('id')->first();
                if (! $movement || $movement->stockable->stock < $item->quantity || $movement->stockable->stockMovements()->where('id', '>', $movement->id)->exists()) {
                    throw ValidationException::withMessages(['purchase' => "Pembelian tidak dapat dibatalkan karena stok {$item->item_name} sudah bergerak setelah penerimaan."]);
                }
                StockMovementService::record($movement->stockable, StockMovementType::Adjustment, -$item->quantity, "Void pembelian {$purchase->number}: {$reason}", $actor->id, ['reference' => $item, 'unit_cost' => $movement->unit_cost_snapshot, 'force_average_cost_after' => $movement->average_cost_before]);
            }
            $purchase->installments()->update(['status' => 'void']);
            $purchase->update(['document_status' => 'void', 'payment_status' => 'void', 'voided_by' => $actor->id, 'voided_at' => now(), 'void_reason' => $reason]);
        });
    }

    private function schedules(array $data, string $term, int $balance): array
    {
        if ($balance === 0) {
            return [];
        }
        $schedules = $term === 'installment' && ! empty($data['installments'])
            ? collect($data['installments'])->map(fn ($row) => ['due_date' => $row['due_date'], 'amount' => (int) $row['amount']])->all()
            : [['due_date' => $data['due_date'], 'amount' => $balance]];
        if (collect($schedules)->sum('amount') !== $balance) {
            throw ValidationException::withMessages(['installments' => 'Jumlah seluruh termin harus sama dengan sisa hutang.']);
        }

        return $schedules;
    }
}
