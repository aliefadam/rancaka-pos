<?php

namespace App\Services;

use App\Models\TenantBranchRelationship;
use App\Models\User;

class ReportOutletScopeService
{
    private const REPORTABLE_STATUSES = [
        'approved_pending_billing',
        'active',
        'exit_requested',
        'detached_pending',
        'detached',
    ];

    /**
     * @return array{
     *     value: string,
     *     label: string,
     *     tenant_ids: array<int, int>,
     *     can_filter: bool,
     *     includes_other_tenants: bool,
     *     options: array<int, array{value: string, label: string, kind: string}>
     * }
     */
    public function resolve(User $user, ?string $requestedScope = null): array
    {
        $tenant = $user->tenant;
        $ownScope = [
            'value' => 'central',
            'label' => $tenant->name,
            'tenant_ids' => [$tenant->id],
            'can_filter' => false,
            'includes_other_tenants' => false,
            'options' => [],
        ];

        if (! $tenant->isCentral()) {
            return $ownScope;
        }

        $branches = TenantBranchRelationship::query()
            ->where('parent_tenant_id', $tenant->id)
            ->whereIn('status', self::REPORTABLE_STATUSES)
            ->with('branchTenant:id,name')
            ->orderBy('branch_tenant_id')
            ->get()
            ->unique('branch_tenant_id')
            ->map(fn (TenantBranchRelationship $relationship) => $relationship->branchTenant)
            ->filter()
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();

        if ($branches->isEmpty()) {
            return $ownScope;
        }

        $branchIds = $branches->pluck('id')->map(fn ($id) => (int) $id)->all();
        $options = collect([
            ['value' => 'central', 'label' => 'Pusat · '.$tenant->name, 'kind' => 'central'],
            ['value' => 'branches', 'label' => 'Semua cabang', 'kind' => 'branches'],
            ['value' => 'combined', 'label' => 'Gabungan pusat + cabang', 'kind' => 'combined'],
        ])->concat($branches->map(fn ($branch) => [
            'value' => 'branch:'.$branch->id,
            'label' => 'Cabang · '.$branch->name,
            'kind' => 'branch',
        ]))->values()->all();

        $value = trim((string) $requestedScope);
        $validValues = array_column($options, 'value');
        if (! in_array($value, $validValues, true)) {
            $value = 'central';
        }

        $tenantIds = match ($value) {
            'branches' => $branchIds,
            'combined' => [$tenant->id, ...$branchIds],
            default => str_starts_with($value, 'branch:')
                ? [(int) substr($value, 7)]
                : [$tenant->id],
        };
        $selected = collect($options)->firstWhere('value', $value);

        return [
            'value' => $value,
            'label' => $selected['label'],
            'tenant_ids' => $tenantIds,
            'can_filter' => true,
            'includes_other_tenants' => collect($tenantIds)->contains(fn (int $id) => $id !== $tenant->id),
            'options' => $options,
        ];
    }

    public function canAccessTenant(User $user, int $tenantId): bool
    {
        return in_array($tenantId, $this->resolve($user, 'combined')['tenant_ids'], true);
    }
}
