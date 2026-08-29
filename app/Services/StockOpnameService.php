<?php

namespace App\Services;

use App\Enums\StockMovementType;
use App\Enums\StockOpnameStatus;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\StockMovement;
use App\Models\StockOpname;
use App\Models\StockOpnameItem;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class StockOpnameService
{
    public function create(User $actor, array $data): StockOpname
    {
        return DB::transaction(function () use ($actor, $data) {
            Tenant::query()->lockForUpdate()->findOrFail($actor->tenant_id);

            if (StockOpname::query()
                ->where('tenant_id', $actor->tenant_id)
                ->whereIn('status', [
                    StockOpnameStatus::Draft,
                    StockOpnameStatus::Counting,
                    StockOpnameStatus::Submitted,
                ])->exists()) {
                throw ValidationException::withMessages([
                    'opname' => 'Selesaikan atau batalkan sesi stock opname yang masih aktif terlebih dahulu.',
                ]);
            }

            $products = Product::query()
                ->where('tenant_id', $actor->tenant_id)
                ->where('is_active', true)
                ->where('track_stock', true)
                ->orderBy('name')
                ->lockForUpdate()
                ->get();
            $rawMaterials = RawMaterial::query()
                ->where('tenant_id', $actor->tenant_id)
                ->where('is_active', true)
                ->orderBy('name')
                ->lockForUpdate()
                ->get();

            if ($products->isEmpty() && $rawMaterials->isEmpty()) {
                throw ValidationException::withMessages([
                    'opname' => 'Belum ada produk atau bahan baku aktif yang dapat dihitung.',
                ]);
            }

            $snapshotAt = now();
            $snapshotMovementId = (int) StockMovement::query()
                ->where('tenant_id', $actor->tenant_id)
                ->max('id');
            $opname = StockOpname::create([
                'tenant_id' => $actor->tenant_id,
                'number' => 'OPN-'.$snapshotAt->format('Ymd').'-'.Str::upper(Str::random(6)),
                'opname_date' => $data['opname_date'],
                'status' => StockOpnameStatus::Draft,
                'note' => $data['note'] ?? null,
                'snapshot_at' => $snapshotAt,
                'snapshot_movement_id' => $snapshotMovementId,
                'created_by' => $actor->id,
            ]);

            $rows = $products->map(fn (Product $product) => $this->snapshotRow(
                $opname,
                $product,
                'product',
                'pcs',
                (float) $product->cost,
            ))->concat($rawMaterials->map(fn (RawMaterial $material) => $this->snapshotRow(
                $opname,
                $material,
                'raw_material',
                $material->unit,
                (float) $material->average_cost,
            )))->all();

            StockOpnameItem::insert($rows);

            return $opname->fresh(['items']);
        });
    }

    public function start(User $actor, StockOpname $opname): StockOpname
    {
        return DB::transaction(function () use ($actor, $opname) {
            $opname = $this->locked($actor, $opname);
            $this->expectStatus($opname, StockOpnameStatus::Draft);
            $opname->update([
                'status' => StockOpnameStatus::Counting,
                'started_by' => $actor->id,
                'started_at' => now(),
            ]);

            return $opname->fresh();
        });
    }

    /**
     * @param  array<int, array{id: int, physical_stock: float|int|string}>  $rows
     */
    public function saveCounts(User $actor, StockOpname $opname, array $rows): StockOpname
    {
        return DB::transaction(function () use ($actor, $opname, $rows) {
            $opname = $this->locked($actor, $opname);
            $this->expectStatus($opname, StockOpnameStatus::Counting);
            $items = $opname->items()->whereIn('id', collect($rows)->pluck('id'))->lockForUpdate()->get()->keyBy('id');

            if ($items->count() !== count($rows)) {
                throw ValidationException::withMessages(['items' => 'Terdapat item opname yang tidak valid.']);
            }

            foreach ($rows as $row) {
                $item = $items->get((int) $row['id']);
                $physical = (float) $row['physical_stock'];
                if ($item->item_type === 'product' && $physical !== floor($physical)) {
                    throw ValidationException::withMessages([
                        'items' => "Stok fisik {$item->item_name} harus berupa bilangan bulat.",
                    ]);
                }

                $this->reconcile($opname, $item, $physical, $actor);
            }

            return $opname->fresh(['items']);
        });
    }

    public function submit(User $actor, StockOpname $opname): StockOpname
    {
        return DB::transaction(function () use ($actor, $opname) {
            $opname = $this->locked($actor, $opname);
            $this->expectStatus($opname, StockOpnameStatus::Counting);
            $missing = $opname->items()->whereNull('physical_stock')->count();
            if ($missing > 0) {
                throw ValidationException::withMessages([
                    'items' => "Masih ada {$missing} item yang belum dihitung.",
                ]);
            }

            $opname->update([
                'status' => StockOpnameStatus::Submitted,
                'submitted_by' => $actor->id,
                'submitted_at' => now(),
                'review_note' => null,
            ]);

            return $opname->fresh();
        });
    }

    public function returnToCounting(User $actor, StockOpname $opname, string $reason): StockOpname
    {
        abort_unless($actor->isOwner(), 403);

        return DB::transaction(function () use ($actor, $opname, $reason) {
            $opname = $this->locked($actor, $opname);
            $this->expectStatus($opname, StockOpnameStatus::Submitted);
            $opname->update([
                'status' => StockOpnameStatus::Counting,
                'submitted_by' => null,
                'submitted_at' => null,
                'review_note' => $reason,
            ]);

            return $opname->fresh();
        });
    }

    public function post(User $actor, StockOpname $opname): StockOpname
    {
        abort_unless($actor->isOwner(), 403);

        return DB::transaction(function () use ($actor, $opname) {
            $opname = $this->locked($actor, $opname);
            $this->expectStatus($opname, StockOpnameStatus::Submitted);
            $items = $opname->items()->orderBy('id')->lockForUpdate()->get();

            foreach ($items as $item) {
                $stockable = $item->stockable()->lockForUpdate()->first();
                if (! $stockable || $stockable->tenant_id !== $actor->tenant_id) {
                    throw ValidationException::withMessages([
                        'items' => "Item {$item->item_name} sudah tidak tersedia dan sesi tidak dapat diposting.",
                    ]);
                }

                $variance = round((float) $item->variance_quantity, 4);
                $stockBefore = (float) $stockable->stock;
                if ($stockBefore + $variance < -0.000001) {
                    throw ValidationException::withMessages([
                        'items' => "Stok {$item->item_name} sudah berubah dan tidak cukup untuk menerapkan selisih. Kembalikan sesi untuk dihitung ulang.",
                    ]);
                }

                $movement = null;
                if (abs($variance) > 0.000001) {
                    $context = ['reference' => $item];
                    if ($variance > 0) {
                        $context['unit_cost'] = $stockable instanceof RawMaterial
                            ? (float) $stockable->average_cost
                            : (float) $stockable->cost;
                    }
                    $movement = StockMovementService::record(
                        $stockable,
                        StockMovementType::Adjustment,
                        $variance,
                        "Stock opname {$opname->number}: selisih fisik",
                        $actor->id,
                        $context,
                    );
                }

                $item->update([
                    'posted_stock_before' => $stockBefore,
                    'posted_stock_after' => $stockBefore + $variance,
                    'stock_movement_id' => $movement?->id,
                ]);
            }

            $opname->update([
                'status' => StockOpnameStatus::Posted,
                'posted_by' => $actor->id,
                'posted_at' => now(),
            ]);

            return $opname->fresh(['items']);
        });
    }

    public function cancel(User $actor, StockOpname $opname, string $reason): StockOpname
    {
        abort_unless($actor->isOwner(), 403);

        return DB::transaction(function () use ($actor, $opname, $reason) {
            $opname = $this->locked($actor, $opname);
            if (! in_array($opname->status, [StockOpnameStatus::Draft, StockOpnameStatus::Counting, StockOpnameStatus::Submitted], true)) {
                throw ValidationException::withMessages(['opname' => 'Sesi yang sudah final tidak dapat dibatalkan.']);
            }
            $opname->update([
                'status' => StockOpnameStatus::Cancelled,
                'cancelled_by' => $actor->id,
                'cancelled_at' => now(),
                'cancel_reason' => $reason,
            ]);

            return $opname->fresh();
        });
    }

    private function reconcile(StockOpname $opname, StockOpnameItem $item, float $physical, User $actor): void
    {
        $countedAt = now();
        $movements = StockMovement::query()
            ->where('tenant_id', $opname->tenant_id)
            ->where('stockable_type', $item->stockable_type)
            ->where('stockable_id', $item->stockable_id)
            ->where('id', '>', $opname->snapshot_movement_id)
            ->where('created_at', '<=', $countedAt);
        $expected = round((float) $item->system_stock_snapshot + (float) (clone $movements)->sum('quantity'), 4);
        $lastMovement = (clone $movements)->latest('id')->first();
        $cost = (float) ($lastMovement?->average_cost_after ?? $item->average_cost_snapshot);
        $variance = round($physical - $expected, 4);

        $item->update([
            'physical_stock' => $physical,
            'counted_by' => $actor->id,
            'counted_at' => $countedAt,
            'expected_stock_at_count' => $expected,
            'average_cost_at_count' => $cost,
            'variance_quantity' => $variance,
            'variance_value' => round($variance * $cost, 4),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function snapshotRow(StockOpname $opname, Product|RawMaterial $stockable, string $type, string $unit, float $cost): array
    {
        return [
            'stock_opname_id' => $opname->id,
            'tenant_id' => $opname->tenant_id,
            'stockable_type' => $stockable->getMorphClass(),
            'stockable_id' => $stockable->id,
            'item_name' => $stockable->name,
            'item_type' => $type,
            'unit_name' => $unit,
            'system_stock_snapshot' => (float) $stockable->stock,
            'average_cost_snapshot' => $cost,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    private function locked(User $actor, StockOpname $opname): StockOpname
    {
        return StockOpname::query()
            ->where('tenant_id', $actor->tenant_id)
            ->lockForUpdate()
            ->findOrFail($opname->id);
    }

    private function expectStatus(StockOpname $opname, StockOpnameStatus $status): void
    {
        if ($opname->status !== $status) {
            throw ValidationException::withMessages([
                'opname' => 'Status sesi telah berubah. Muat ulang halaman dan coba kembali.',
            ]);
        }
    }
}
