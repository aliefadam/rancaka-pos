<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\BillingInvoice;
use App\Models\Tenant;
use App\Models\TenantBranchRelationship;
use App\Models\Transaction;
use App\Services\BranchCatalogMigrationService;
use App\Services\BranchNetworkService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BranchNetworkController extends Controller
{
    public function index(Request $request, BranchNetworkService $network): Response
    {
        abort_unless(config('billing.branch_network_enabled'), 404);
        $tenant = $request->user()->tenant;
        abort_unless($request->user()->isOwner(), 403);
        $network->syncDueTransitions($tenant);

        $relationship = $tenant->currentBranchRelationship()
            ->with(['parentTenant:id,name,email,phone,branch_network_code', 'branchTenant:id,name,email', 'histories.actor:id,name'])
            ->first();

        $branches = collect();
        $summary = null;
        $nextInvoice = null;
        if ($tenant->isCentral()) {
            $today = now()->startOfDay();
            $month = now()->startOfMonth();
            $branches = $tenant->branchRelationships()
                ->whereIn('status', TenantBranchRelationship::OPEN_STATUSES)
                ->with(['branchTenant.owner:id,tenant_id,name,email', 'branchTenant.subscription'])
                ->latest('requested_at')->get()
                ->map(function (TenantBranchRelationship $relation) use ($today, $month) {
                    $transactions = Transaction::query()->where('tenant_id', $relation->branch_tenant_id)->where('status', 'completed');

                    return [
                        ...$relation->toArray(),
                        'today_revenue' => (int) (clone $transactions)->where('created_at', '>=', $today)->sum('total'),
                        'month_revenue' => (int) (clone $transactions)->where('created_at', '>=', $month)->sum('total'),
                        'today_transactions' => (int) (clone $transactions)->where('created_at', '>=', $today)->count(),
                        'month_transactions' => (int) (clone $transactions)->where('created_at', '>=', $month)->count(),
                    ];
                });
            $summary = [
                'total' => $branches->count(),
                'pending' => $branches->whereIn('status', ['pending_parent_approval', 'pending_admin_approval'])->count(),
                'trial' => $branches->filter(fn ($row) => data_get($row, 'trial_ends_at') && now()->lt(data_get($row, 'trial_ends_at')))->count(),
                'active' => $branches->whereIn('status', ['approved_pending_billing', 'active'])->count(),
                'detaching' => $branches->whereIn('status', ['exit_requested', 'detached_pending'])->count(),
                'today_revenue' => $branches->sum('today_revenue'),
                'month_revenue' => $branches->sum('month_revenue'),
                'today_transactions' => $branches->sum('today_transactions'),
                'month_transactions' => $branches->sum('month_transactions'),
                'next_branch_cost' => $branches->filter(fn ($row) => in_array($row['status'], ['approved_pending_billing', 'active', 'exit_requested', 'detached_pending'], true))->count() * (int) config('billing.branch_monthly_price'),
            ];
            $nextInvoice = BillingInvoice::query()->where('tenant_id', $tenant->id)->whereIn('status', ['open', 'pending', 'rejected'])->with('items.branchTenant:id,name')->oldest('period_start')->first();
        }

        return Inertia::render('Tenant/Network/Index', [
            'tenant' => $tenant->only(['id', 'name', 'tenant_type', 'branch_network_code']),
            'relationship' => $relationship,
            'branches' => $branches,
            'summary' => $summary,
            'nextInvoice' => $nextInvoice,
            'branchPrice' => (int) config('billing.branch_monthly_price'),
            'notifications' => $request->user()->notifications()->latest()->limit(10)->get(),
            'catalogMigration' => $relationship ? [
                'run_count' => $relationship->catalogMigrations()->count(),
                'last_run' => $relationship->catalogMigrations()
                    ->latest('completed_at')
                    ->first()?->only([
                        'categories_created', 'categories_matched', 'products_created',
                        'products_matched', 'products_unchanged', 'completed_at',
                    ]),
            ] : null,
        ]);
    }

    public function migrateCatalog(
        Request $request,
        TenantBranchRelationship $relationship,
        BranchCatalogMigrationService $migration,
    ): RedirectResponse {
        $result = $migration->migrate($relationship, $request->user());

        $message = $result->products_created > 0
            ? "Migrasi selesai. {$result->products_created} produk baru ditambahkan dengan stok 0."
            : 'Migrasi selesai. Tidak ada produk baru; data cabang yang sudah ada tetap dipertahankan.';

        return back()->with('success', $message);
    }

    public function enable(Request $request, BranchNetworkService $network): RedirectResponse
    {
        abort_unless($request->user()->isOwner(), 403);
        $network->makeCentral($request->user()->tenant, $request->input('branch_network_code'));

        return back()->with('success', 'Jaringan cabang aktif dan kode pusat siap digunakan.');
    }

    public function updateCode(Request $request, BranchNetworkService $network): RedirectResponse
    {
        abort_unless($request->user()->isOwner() && $request->user()->tenant->isCentral(), 403);
        $network->makeCentral($request->user()->tenant, $request->input('branch_network_code'));

        return back()->with('success', 'Kode jaringan diperbarui tanpa memutus cabang aktif.');
    }

    public function join(Request $request, BranchNetworkService $network): RedirectResponse
    {
        $tenant = $request->user()->tenant;
        abort_unless($request->user()->isOwner() && $tenant->tenant_type === 'standalone', 403);
        $request->merge(['network_code' => BranchNetworkService::normalizeCode($request->input('network_code'))]);
        $data = $request->validate([
            'network_code' => ['required', 'regex:/^[A-Z0-9_-]{4,30}$/', Rule::exists('tenants', 'branch_network_code')->where('tenant_type', 'central')->where('status', 'active')],
            'reason' => ['nullable', 'string', 'max:1000'],
        ], ['network_code.exists' => 'Kode jaringan tidak ditemukan atau tenant pusat tidak aktif.']);
        $parent = Tenant::query()->where('branch_network_code', $data['network_code'])->firstOrFail();
        $network->requestJoin($parent, $tenant, $request->user(), $data['reason'] ?? null);

        return back()->with('success', 'Pengajuan bergabung dikirim ke owner pusat.');
    }

    public function parentDecision(Request $request, TenantBranchRelationship $relationship, BranchNetworkService $network): RedirectResponse
    {
        $data = $request->validate(['decision' => ['required', 'in:approve,reject'], 'reason' => ['nullable', 'required_if:decision,reject', 'string', 'max:1000']]);
        $network->parentDecision($relationship, $request->user(), $data['decision'] === 'approve', $data['reason'] ?? null);

        return back()->with('success', $data['decision'] === 'approve' ? 'Pengajuan diteruskan ke superadmin.' : 'Pengajuan cabang ditolak.');
    }

    public function requestExit(Request $request, TenantBranchRelationship $relationship, BranchNetworkService $network): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:1000']]);
        $network->requestExit($relationship, $request->user(), $data['reason']);

        return back()->with('success', 'Permintaan keluar dikirim ke pusat.');
    }

    public function decideExit(Request $request, TenantBranchRelationship $relationship, BranchNetworkService $network): RedirectResponse
    {
        $data = $request->validate(['decision' => ['required', 'in:approve,reject'], 'reason' => ['nullable', 'string', 'max:1000']]);
        $network->decideExit($relationship, $request->user(), $data['decision'] === 'approve', $data['reason'] ?? null);

        return back()->with('success', $data['decision'] === 'approve' ? 'Pelepasan dijadwalkan pada akhir periode.' : 'Permintaan keluar ditolak.');
    }

    public function detach(Request $request, TenantBranchRelationship $relationship, BranchNetworkService $network): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:1000']]);
        $network->initiateDetach($relationship, $request->user(), $data['reason']);

        return back()->with('success', 'Cabang dijadwalkan lepas pada akhir periode berjalan.');
    }

    public function validateCode(Request $request)
    {
        $code = BranchNetworkService::normalizeCode($request->query('code'));
        $tenant = Tenant::query()->where('branch_network_code', $code)->where('tenant_type', 'central')->where('status', 'active')->first(['id', 'name']);

        return response()->json(['valid' => (bool) $tenant, 'tenant' => $tenant]);
    }
}
