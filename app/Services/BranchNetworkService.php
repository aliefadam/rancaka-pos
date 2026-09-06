<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\BillingInvoice;
use App\Models\SubscriptionPayment;
use App\Models\Tenant;
use App\Models\TenantBranchRelationship;
use App\Models\User;
use App\Notifications\BranchNetworkNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BranchNetworkService
{
    public function __construct(private readonly ConsolidatedBillingService $billing) {}

    public static function normalizeCode(?string $code): ?string
    {
        $value = Str::upper(trim((string) $code));

        return $value === '' ? null : $value;
    }

    public function generateCode(Tenant $tenant): string
    {
        $base = Str::upper(Str::slug($tenant->name, ''));
        $base = Str::limit($base ?: 'RANCAKA', 20, '');
        do {
            $code = $base.'-'.Str::upper(Str::random(5));
        } while (Tenant::query()->where('branch_network_code', $code)->exists());

        return $code;
    }

    public function makeCentral(Tenant $tenant, ?string $requestedCode = null): Tenant
    {
        $code = self::normalizeCode($requestedCode) ?? $tenant->branch_network_code ?? $this->generateCode($tenant);
        if (! preg_match('/^[A-Z0-9_-]{4,30}$/', $code)) {
            throw ValidationException::withMessages(['branch_network_code' => 'Kode jaringan harus 4–30 karakter dan hanya berisi huruf, angka, dash, atau underscore.']);
        }
        if (Tenant::query()->where('branch_network_code', $code)->whereKeyNot($tenant->id)->exists()) {
            throw ValidationException::withMessages(['branch_network_code' => 'Kode jaringan sudah digunakan tenant lain.']);
        }
        if ($tenant->isBranch() || $tenant->currentBranchRelationship()->exists()) {
            throw ValidationException::withMessages(['branch_network_code' => 'Tenant cabang tidak dapat menjadi pusat jaringan.']);
        }
        $tenant->update(['tenant_type' => 'central', 'branch_network_code' => $code]);

        return $tenant->fresh();
    }

    public function requestJoin(Tenant $parent, Tenant $branch, ?User $actor = null, ?string $reason = null, bool $newBranch = false): TenantBranchRelationship
    {
        abort_unless(config('billing.branch_network_enabled'), 404);

        return DB::transaction(function () use ($parent, $branch, $actor, $reason, $newBranch) {
            $parent = Tenant::query()->lockForUpdate()->findOrFail($parent->id);
            $branch = Tenant::query()->lockForUpdate()->findOrFail($branch->id);
            if ($parent->id === $branch->id || $parent->isBranch() || $branch->branchRelationships()->whereIn('status', TenantBranchRelationship::OPEN_STATUSES)->exists()) {
                throw ValidationException::withMessages(['network_code' => 'Struktur jaringan tidak valid. Relasi hanya boleh satu tingkat.']);
            }
            if ($branch->parentRelationships()->whereIn('status', TenantBranchRelationship::OPEN_STATUSES)->exists()) {
                throw ValidationException::withMessages(['network_code' => 'Tenant sudah mempunyai pengajuan atau relasi jaringan aktif.']);
            }
            if (! $parent->branch_network_code) {
                throw ValidationException::withMessages(['network_code' => 'Kode jaringan pusat tidak aktif.']);
            }

            $relationship = TenantBranchRelationship::create([
                'parent_tenant_id' => $parent->id,
                'branch_tenant_id' => $branch->id,
                'network_code_used' => $parent->branch_network_code,
                'status' => 'pending_parent_approval',
                'requested_at' => now(),
                'reason' => $reason,
                'note' => $newBranch ? 'Pendaftaran tenant baru sebagai cabang.' : 'Tenant mandiri mengajukan bergabung.',
            ]);
            $relationship->histories()->create(['to_status' => 'pending_parent_approval', 'changed_by' => $actor?->id, 'reason' => $reason]);
            if ($newBranch) {
                $branch->update(['tenant_type' => 'branch', 'referred_by_sales_id' => null, 'referral_code_used' => null, 'referred_at' => null]);
                $branch->subscription()->update(['status' => 'pending_network', 'is_grandfathered' => false, 'trial_ends_at' => null]);
            }
            $parent->owner?->notify(new BranchNetworkNotification([
                'kind' => 'branch_request', 'title' => 'Pengajuan cabang baru',
                'message' => $branch->name.' ingin bergabung ke jaringan Anda.', 'relationship_id' => $relationship->id,
            ]));

            return $relationship;
        });
    }

    public function parentDecision(TenantBranchRelationship $relationship, User $actor, bool $approve, ?string $reason = null): TenantBranchRelationship
    {
        return DB::transaction(function () use ($relationship, $actor, $approve, $reason) {
            $relationship = TenantBranchRelationship::query()->lockForUpdate()->with(['parentTenant', 'branchTenant.owner'])->findOrFail($relationship->id);
            abort_unless($relationship->status === 'pending_parent_approval', 422, 'Pengajuan sudah diproses.');
            abort_unless($actor->isSuperadmin() || ($actor->isOwner() && $actor->tenant_id === $relationship->parent_tenant_id), 403);
            $this->transition($relationship, $approve ? 'pending_admin_approval' : 'rejected', $actor, $reason);
            if ($approve) {
                User::query()->where('role', UserRole::Superadmin->value)->get()->each->notify(new BranchNetworkNotification([
                    'kind' => 'admin_approval', 'title' => 'Persetujuan cabang diperlukan',
                    'message' => $relationship->branchTenant->name.' telah disetujui '.$relationship->parentTenant->name.'.',
                    'relationship_id' => $relationship->id,
                ]));
            } else {
                $this->restoreRejectedNewBranch($relationship);
                $relationship->branchTenant->owner?->notify(new BranchNetworkNotification([
                    'kind' => 'request_rejected', 'title' => 'Pengajuan cabang ditolak', 'message' => $reason ?: 'Pusat menolak pengajuan cabang Anda.',
                ]));
            }

            return $relationship->fresh();
        });
    }

    public function adminDecision(TenantBranchRelationship $relationship, User $actor, bool $approve, ?string $reason = null): TenantBranchRelationship
    {
        abort_unless($actor->isSuperadmin(), 403);

        return DB::transaction(function () use ($relationship, $actor, $approve, $reason) {
            $relationship = TenantBranchRelationship::query()->lockForUpdate()->with(['parentTenant.subscription', 'branchTenant.subscription', 'branchTenant.owner'])->findOrFail($relationship->id);
            abort_unless($relationship->status === 'pending_admin_approval', 422, 'Pengajuan belum siap atau sudah diproses.');
            if (! $approve) {
                $this->transition($relationship, 'rejected', $actor, $reason);
                $this->restoreRejectedNewBranch($relationship);
                $relationship->branchTenant->owner?->notify(new BranchNetworkNotification(['kind' => 'request_rejected', 'title' => 'Pengajuan cabang ditolak', 'message' => $reason ?: 'Superadmin menolak pengajuan cabang Anda.']));

                return $relationship->fresh();
            }

            $isNewBranch = $relationship->branchTenant->subscription?->status === 'pending_network';
            if (! $isNewBranch) {
                $hasPending = SubscriptionPayment::query()->where('tenant_id', $relationship->branch_tenant_id)->where('status', 'pending')->exists();
                $hasArrears = BillingInvoice::query()->where('tenant_id', $relationship->branch_tenant_id)->whereIn('status', ['open', 'rejected'])->where('due_at', '<', now())->exists();
                if ($hasPending || $hasArrears) {
                    throw ValidationException::withMessages(['relationship' => 'Tenant masih mempunyai pembayaran pending atau tagihan tertunggak.']);
                }
            }

            $eligibleAt = $isNewBranch
                ? now()->addDays(config('billing.trial_days'))
                : collect([$relationship->branchTenant->subscription?->current_period_end, now()])->filter()->max();
            $billingEffective = $this->nextUnissuedParentPeriod($relationship->parentTenant, Carbon::parse($eligibleAt));

            $relationship->update([
                'admin_approved_at' => now(), 'admin_approved_by' => $actor->id,
                'trial_starts_at' => $isNewBranch ? now() : null,
                'trial_ends_at' => $isNewBranch ? now()->addDays(config('billing.trial_days')) : null,
                'billing_effective_at' => $billingEffective,
            ]);
            $this->transition($relationship, 'approved_pending_billing', $actor, $reason);
            $relationship->branchTenant->update(['tenant_type' => 'branch', 'referred_by_sales_id' => null, 'referral_code_used' => null, 'referred_at' => null]);
            if ($isNewBranch) {
                $relationship->branchTenant->subscription()->update(['status' => 'trialing', 'trial_ends_at' => $relationship->trial_ends_at]);
            }
            $relationship->branchTenant->owner?->notify(new BranchNetworkNotification([
                'kind' => 'request_approved', 'title' => 'Cabang disetujui',
                'message' => 'Akses jaringan aktif. Billing pusat berlaku mulai '.$billingEffective->translatedFormat('d M Y').'.',
            ]));

            return $relationship->fresh();
        });
    }

    public function requestExit(TenantBranchRelationship $relationship, User $actor, string $reason): TenantBranchRelationship
    {
        abort_unless($actor->isOwner() && $actor->tenant_id === $relationship->branch_tenant_id, 403);
        abort_unless(in_array($relationship->status, ['approved_pending_billing', 'active'], true), 422);

        return DB::transaction(function () use ($relationship, $actor, $reason) {
            $relationship->update(['requested_exit_at' => now(), 'reason' => $reason]);
            $this->transition($relationship, 'exit_requested', $actor, $reason);
            $relationship->parentTenant->owner?->notify(new BranchNetworkNotification(['kind' => 'exit_request', 'title' => 'Permintaan keluar jaringan', 'message' => $relationship->branchTenant->name.' meminta keluar dari jaringan.', 'relationship_id' => $relationship->id]));

            return $relationship->fresh();
        });
    }

    public function decideExit(TenantBranchRelationship $relationship, User $actor, bool $approve, ?string $reason = null): TenantBranchRelationship
    {
        abort_unless($actor->isSuperadmin() || ($actor->isOwner() && $actor->tenant_id === $relationship->parent_tenant_id), 403);
        abort_unless($relationship->status === 'exit_requested', 422);

        return DB::transaction(function () use ($relationship, $actor, $approve, $reason) {
            if (! $approve) {
                $this->transition($relationship, 'active', $actor, $reason);

                return $relationship->fresh();
            }
            $end = $relationship->parentTenant->subscription?->current_period_end;
            $effective = $end?->isFuture() ? $end->copy() : now();
            $relationship->update(['detach_effective_at' => $effective, 'note' => $reason]);
            $this->transition($relationship, 'detached_pending', $actor, $reason);
            $relationship->branchTenant->owner?->notify(new BranchNetworkNotification(['kind' => 'detach_scheduled', 'title' => 'Pelepasan cabang dijadwalkan', 'message' => 'Cabang menjadi tenant mandiri pada '.$effective->translatedFormat('d M Y').'.']));

            return $relationship->fresh();
        });
    }

    public function initiateDetach(TenantBranchRelationship $relationship, User $actor, string $reason): TenantBranchRelationship
    {
        abort_unless($actor->isSuperadmin() || ($actor->isOwner() && $actor->tenant_id === $relationship->parent_tenant_id), 403);
        abort_unless(in_array($relationship->status, ['approved_pending_billing', 'active'], true), 422);

        return DB::transaction(function () use ($relationship, $actor, $reason) {
            $end = $relationship->parentTenant->subscription?->current_period_end;
            $effective = $end?->isFuture() ? $end->copy() : now();
            $relationship->update(['requested_exit_at' => now(), 'reason' => $reason, 'detach_effective_at' => $effective]);
            $this->transition($relationship, 'detached_pending', $actor, $reason);
            $relationship->branchTenant->owner?->notify(new BranchNetworkNotification(['kind' => 'detach_scheduled', 'title' => 'Pelepasan cabang dijadwalkan', 'message' => 'Pusat menjadwalkan cabang menjadi tenant mandiri pada '.$effective->translatedFormat('d M Y').'.']));

            return $relationship->fresh();
        });
    }

    public function syncDueTransitions(?Tenant $tenant = null): void
    {
        TenantBranchRelationship::query()
            ->when($tenant, fn ($query) => $query->where(fn ($q) => $q->where('parent_tenant_id', $tenant->id)->orWhere('branch_tenant_id', $tenant->id)))
            ->where('status', 'approved_pending_billing')->where('billing_effective_at', '<=', now())
            ->get()->each(fn ($relationship) => DB::transaction(function () use ($relationship) {
                $locked = TenantBranchRelationship::lockForUpdate()->find($relationship->id);
                if ($locked?->status === 'approved_pending_billing') {
                    $this->transition($locked, 'active', null, 'Tanggal efektif billing tercapai.');
                }
            }));

        TenantBranchRelationship::query()
            ->when($tenant, fn ($query) => $query->where(fn ($q) => $q->where('parent_tenant_id', $tenant->id)->orWhere('branch_tenant_id', $tenant->id)))
            ->where('status', 'detached_pending')->where('detach_effective_at', '<=', now())
            ->with(['branchTenant.subscription'])->get()->each(function ($relationship) {
                DB::transaction(function () use ($relationship) {
                    $locked = TenantBranchRelationship::lockForUpdate()->find($relationship->id);
                    if (! $locked || $locked->status !== 'detached_pending') {
                        return;
                    }
                    $branch = $relationship->branchTenant;
                    $branch->update(['tenant_type' => 'standalone']);
                    $branch->subscription()->update(['status' => 'expired', 'trial_ends_at' => null, 'current_period_end' => $locked->detach_effective_at]);
                    $this->transition($locked, 'detached', null, 'Tanggal pelepasan efektif tercapai.');
                    $start = $locked->detach_effective_at;
                    $this->billing->createInvoice($branch, $start, $start->copy()->addMonth(), $start);
                });
            });
    }

    public function sendNetworkExpiryNotifications(): void
    {
        Tenant::query()->where('tenant_type', 'central')->with(['owner', 'subscription', 'branchRelationships' => fn ($query) => $query->whereIn('status', ['approved_pending_billing', 'active', 'exit_requested', 'detached_pending'])->with('branchTenant.owner')])->get()->each(function (Tenant $central) {
            $expiresAt = $central->subscription?->status === 'trialing' ? $central->subscription?->trial_ends_at : $central->subscription?->current_period_end;
            if (! $expiresAt || $expiresAt->gt(now()->addDays(3))) {
                return;
            }
            $lifecycleStatus = $central->subscription?->lifecycleStatus();
            $locked = in_array($lifecycleStatus, ['trial_expired', 'suspended'], true);
            $inGracePeriod = $lifecycleStatus === 'grace_period';
            $payload = [
                'kind' => $locked ? 'network_locked' : ($inGracePeriod ? 'network_grace_period' : 'network_expiry'),
                'title' => $locked ? 'Jaringan terkunci' : ($inGracePeriod ? 'Jaringan dalam masa tenggang' : 'Masa aktif jaringan segera berakhir'),
                'message' => $locked
                    ? 'Masa tenggang invoice pusat telah habis sehingga akses jaringan dihentikan.'
                    : ($inGracePeriod
                        ? 'Segera lunasi invoice pusat sebelum '.$central->subscription->graceEndsAt()?->translatedFormat('d M Y').' agar jaringan tidak dibekukan.'
                        : 'Masa aktif jaringan berakhir '.$expiresAt->translatedFormat('d M Y').'.'),
            ];
            $recipients = collect([$central->owner])->merge($central->branchRelationships->pluck('branchTenant.owner'))->filter()->unique('id');
            $recipients->each(function (User $user) use ($payload) {
                $alreadySent = $user->notifications()->where('created_at', '>=', now()->startOfDay())->where('data', 'like', '%"kind":"'.$payload['kind'].'"%')->exists();
                if (! $alreadySent) {
                    $user->notify(new BranchNetworkNotification($payload));
                }
            });
        });
    }

    public function allowsAccess(Tenant $tenant): bool
    {
        $this->syncDueTransitions($tenant);
        $relationship = $tenant->currentBranchRelationship()->with('parentTenant.subscription')->first();
        if (! $relationship || in_array($relationship->status, ['pending_parent_approval', 'pending_admin_approval'], true)) {
            return $tenant->subscription?->allowsAccess() ?? false;
        }
        if (in_array($relationship->status, ['approved_pending_billing', 'active', 'exit_requested', 'detached_pending'], true)) {
            if ($tenant->subscription?->status === 'trialing' && $tenant->subscription->trial_ends_at?->isFuture()) {
                return true;
            }

            return $relationship->parentTenant?->subscription?->allowsAccess() ?? false;
        }

        return $tenant->subscription?->allowsAccess() ?? false;
    }

    public function paymentIsCentralized(Tenant $tenant): bool
    {
        $relationship = $tenant->currentBranchRelationship;
        if (! $relationship) {
            return false;
        }

        return in_array($relationship->status, ['active', 'exit_requested', 'detached_pending'], true)
            || ($relationship->status === 'approved_pending_billing' && ($relationship->trial_starts_at !== null || $relationship->billing_effective_at?->isPast()));
    }

    private function nextUnissuedParentPeriod(Tenant $parent, Carbon $eligibleAt): Carbon
    {
        $subscription = $parent->subscription;
        $start = collect([$subscription?->current_period_end, $subscription?->trial_ends_at, now()])->filter()->max();
        $start = Carbon::parse($start);
        while ($start->lt($eligibleAt) || BillingInvoice::query()->where('tenant_id', $parent->id)->where('period_start', $start)->exists()) {
            $start->addMonth();
        }

        return $start;
    }

    private function transition(TenantBranchRelationship $relationship, string $status, ?User $actor, ?string $reason): void
    {
        $from = $relationship->status;
        $relationship->update([
            'status' => $status,
            ...($status === 'pending_admin_approval' ? ['parent_approved_at' => now(), 'parent_approved_by' => $actor?->id] : []),
        ]);
        $relationship->histories()->create(['from_status' => $from, 'to_status' => $status, 'changed_by' => $actor?->id, 'reason' => $reason]);
    }

    private function restoreRejectedNewBranch(TenantBranchRelationship $relationship): void
    {
        if ($relationship->branchTenant->subscription?->status === 'pending_network') {
            $trialEnd = now()->addDays(config('billing.trial_days'));
            $relationship->branchTenant->update(['tenant_type' => 'standalone']);
            $relationship->branchTenant->subscription()->update(['status' => 'trialing', 'trial_ends_at' => $trialEnd]);
            $this->billing->createInvoice($relationship->branchTenant, $trialEnd, $trialEnd->copy()->addMonth(), $trialEnd);
        }
    }
}
