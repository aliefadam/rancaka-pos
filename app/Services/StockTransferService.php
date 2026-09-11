<?php

namespace App\Services;

use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\StockTransfer;
use App\Models\Tenant;
use App\Models\TenantBranchRelationship;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockTransferService
{
    private const NETWORK_STATUSES = ['approved_pending_billing', 'active'];

    public function destinations(Tenant $tenant): Collection
    {
        return Tenant::query()
            ->whereIn('id', $this->networkTenantIds($tenant))
            ->whereKeyNot($tenant->id)
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'tenant_type']);
    }

    public function transferableProducts(Tenant $source, int $destinationId): Collection
    {
        if (! in_array($destinationId, $this->networkTenantIds($source), true) || $destinationId === $source->id) {
            return collect();
        }

        $products = Product::query()
            ->where('tenant_id', $source->id)
            ->where('track_stock', true)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'stock', 'cost', 'source_product_id']);

        $destinationProducts = Product::query()
            ->where('tenant_id', $destinationId)
            ->where('is_active', true)
            ->get(['id', 'source_product_id'])
            ->keyBy(fn (Product $product) => $product->source_product_id ?? $product->id);

        return $products->filter(function (Product $product) use ($source, $destinationProducts) {
            $canonicalId = $source->isCentral() ? $product->id : $product->source_product_id;

            return $canonicalId && $destinationProducts->has($canonicalId);
        })->values();
    }

    public function create(User $actor, array $data): StockTransfer
    {
        return DB::transaction(function () use ($actor, $data) {
            $source = Tenant::query()->findOrFail($actor->tenant_id);
            $destinationId = (int) $data['destination_tenant_id'];

            if ($destinationId === $source->id || ! in_array($destinationId, $this->networkTenantIds($source), true)) {
                throw ValidationException::withMessages(['destination_tenant_id' => 'Cabang tujuan tidak berada dalam jaringan aktif yang sama.']);
            }

            $destination = Tenant::query()->where('status', 'active')->find($destinationId);
            if (! $destination) {
                throw ValidationException::withMessages(['destination_tenant_id' => 'Cabang tujuan tidak aktif.']);
            }

            $rows = collect($data['items'])->groupBy('product_id')->map(fn (Collection $group) => [
                'product_id' => (int) $group->first()['product_id'],
                'quantity' => (int) $group->sum('quantity'),
            ])->values();

            $sourceProducts = Product::query()
                ->where('tenant_id', $source->id)
                ->whereIn('id', $rows->pluck('product_id'))
                ->lockForUpdate()
                ->get()->keyBy('id');

            $resolved = $rows->map(function (array $row) use ($source, $destination, $sourceProducts) {
                $product = $sourceProducts->get($row['product_id']);
                if (! $product || ! $product->track_stock || ! $product->is_active) {
                    throw ValidationException::withMessages(['items' => 'Salah satu produk tidak tersedia untuk ditransfer.']);
                }
                if ($row['quantity'] <= 0 || $row['quantity'] > (float) $product->stock) {
                    throw ValidationException::withMessages(['items' => "Stok {$product->name} tidak mencukupi. Tersedia {$product->stock}."]);
                }

                $canonicalId = $source->isCentral() ? $product->id : $product->source_product_id;
                $destinationProduct = Product::query()
                    ->where('tenant_id', $destination->id)
                    ->where(fn ($query) => $destination->isCentral()
                        ? $query->whereKey($canonicalId)
                        : $query->where('source_product_id', $canonicalId))
                    ->where('is_active', true)
                    ->first();

                if (! $canonicalId || ! $destinationProduct) {
                    throw ValidationException::withMessages(['items' => "Produk {$product->name} belum tersinkron di cabang tujuan."]);
                }

                return compact('product', 'destinationProduct') + ['quantity' => $row['quantity']];
            });

            $transfer = StockTransfer::query()->create([
                'number' => 'TRF-'.now()->format('Ymd').'-'.strtoupper(str()->random(6)),
                'source_tenant_id' => $source->id,
                'destination_tenant_id' => $destination->id,
                'status' => 'in_transit',
                'note' => $data['note'] ?? null,
                'created_by' => $actor->id,
                'dispatched_at' => now(),
            ]);

            foreach ($resolved as $row) {
                $item = $transfer->items()->create([
                    'source_product_id' => $row['product']->id,
                    'destination_product_id' => $row['destinationProduct']->id,
                    'product_name' => $row['product']->name,
                    'quantity' => $row['quantity'],
                    'unit_cost_snapshot' => $row['product']->cost,
                ]);
                StockMovementService::record($row['product'], StockMovementType::TransferOut, -$row['quantity'], "Transfer {$transfer->number} ke {$destination->name}", $actor->id, ['reference' => $item]);
            }

            return $transfer;
        });
    }

    public function receive(User $actor, StockTransfer $transfer): void
    {
        DB::transaction(function () use ($actor, $transfer) {
            $transfer = StockTransfer::query()->with('items.destinationProduct')->lockForUpdate()->findOrFail($transfer->id);
            abort_unless($transfer->destination_tenant_id === $actor->tenant_id, 403);
            $this->ensureInTransit($transfer);

            foreach ($transfer->items as $item) {
                abort_unless($item->destinationProduct?->tenant_id === $actor->tenant_id, 422);
                StockMovementService::record($item->destinationProduct, StockMovementType::TransferIn, (float) $item->quantity, "Penerimaan transfer {$transfer->number}", $actor->id, ['reference' => $item, 'unit_cost' => (float) $item->unit_cost_snapshot]);
            }
            $transfer->update(['status' => 'received', 'received_by' => $actor->id, 'received_at' => now()]);
        });
    }

    public function cancel(User $actor, StockTransfer $transfer, string $reason): void
    {
        abort_unless($transfer->source_tenant_id === $actor->tenant_id, 403);
        $this->returnToSource($actor, $transfer, 'cancelled', $reason);
    }

    public function reject(User $actor, StockTransfer $transfer, string $reason): void
    {
        abort_unless($transfer->destination_tenant_id === $actor->tenant_id, 403);
        $this->returnToSource($actor, $transfer, 'rejected', $reason);
    }

    private function returnToSource(User $actor, StockTransfer $transfer, string $status, string $reason): void
    {
        DB::transaction(function () use ($actor, $transfer, $status, $reason) {
            $transfer = StockTransfer::query()->with('items.sourceProduct')->lockForUpdate()->findOrFail($transfer->id);
            $this->ensureInTransit($transfer);
            foreach ($transfer->items as $item) {
                StockMovementService::record($item->sourceProduct, StockMovementType::TransferReturn, (float) $item->quantity, "Pengembalian transfer {$transfer->number}", $actor->id, ['reference' => $item, 'unit_cost' => (float) $item->unit_cost_snapshot]);
            }
            $transfer->update([
                'status' => $status, 'resolution_note' => $reason,
                $status.'_by' => $actor->id, $status.'_at' => now(),
            ]);
        });
    }

    private function ensureInTransit(StockTransfer $transfer): void
    {
        if ($transfer->status !== 'in_transit') {
            throw ValidationException::withMessages(['transfer' => 'Transfer ini sudah diselesaikan dan tidak dapat diproses ulang.']);
        }
    }

    /** @return array<int, int> */
    private function networkTenantIds(Tenant $tenant): array
    {
        if ($tenant->isCentral()) {
            return TenantBranchRelationship::query()->where('parent_tenant_id', $tenant->id)
                ->whereIn('status', self::NETWORK_STATUSES)->pluck('branch_tenant_id')->push($tenant->id)->unique()->values()->all();
        }

        $relationship = TenantBranchRelationship::query()->where('branch_tenant_id', $tenant->id)
            ->whereIn('status', self::NETWORK_STATUSES)->latest('id')->first();
        if (! $relationship) {
            return [$tenant->id];
        }

        return TenantBranchRelationship::query()->where('parent_tenant_id', $relationship->parent_tenant_id)
            ->whereIn('status', self::NETWORK_STATUSES)->pluck('branch_tenant_id')
            ->push($relationship->parent_tenant_id)->unique()->values()->all();
    }
}
