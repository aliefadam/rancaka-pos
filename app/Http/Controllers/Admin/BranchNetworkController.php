<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\TenantBranchRelationship;
use App\Models\TenantImpersonationLog;
use App\Services\BranchNetworkService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BranchNetworkController extends Controller
{
    public function index(Request $request, BranchNetworkService $network): Response
    {
        abort_unless(config('billing.branch_network_enabled'), 404);
        $network->syncDueTransitions();
        $status = $request->string('status')->toString();
        $search = $request->string('search')->toString();
        $relationships = TenantBranchRelationship::query()
            ->with(['parentTenant:id,name,branch_network_code', 'branchTenant:id,name,email,status', 'branchTenant.owner:id,tenant_id,name', 'histories.actor:id,name'])
            ->when($status, fn ($query) => $query->where('status', $status))
            ->when($search, fn ($query) => $query->where(fn ($q) => $q
                ->whereHas('parentTenant', fn ($t) => $t->where('name', 'like', "%{$search}%"))
                ->orWhereHas('branchTenant', fn ($t) => $t->where('name', 'like', "%{$search}%"))))
            ->latest('requested_at')->paginate(15)->withQueryString();

        return Inertia::render('Admin/Networks/Index', [
            'relationships' => $relationships,
            'filters' => ['status' => $status, 'search' => $search],
            'centrals' => Tenant::query()->where('tenant_type', 'central')->withCount(['branchRelationships as open_branches_count' => fn ($q) => $q->whereIn('status', TenantBranchRelationship::OPEN_STATUSES)])->orderBy('name')->get(['id', 'name', 'branch_network_code']),
            'auditLogs' => TenantImpersonationLog::with(['actor:id,name', 'parentTenant:id,name', 'branchTenant:id,name'])->latest('started_at')->limit(20)->get(),
        ]);
    }

    public function decision(Request $request, TenantBranchRelationship $relationship, BranchNetworkService $network): RedirectResponse
    {
        $data = $request->validate(['decision' => ['required', 'in:approve,reject'], 'reason' => ['nullable', 'required_if:decision,reject', 'string', 'max:1000']]);
        $network->adminDecision($relationship, $request->user(), $data['decision'] === 'approve', $data['reason'] ?? null);

        return back()->with('success', $data['decision'] === 'approve' ? 'Cabang disetujui dan trial dimulai.' : 'Pengajuan cabang ditolak.');
    }

    public function decideExit(Request $request, TenantBranchRelationship $relationship, BranchNetworkService $network): RedirectResponse
    {
        $data = $request->validate(['decision' => ['required', 'in:approve,reject'], 'reason' => ['nullable', 'string', 'max:1000']]);
        $network->decideExit($relationship, $request->user(), $data['decision'] === 'approve', $data['reason'] ?? null);

        return back()->with('success', 'Keputusan pelepasan cabang disimpan.');
    }

    public function updateCode(Request $request, Tenant $tenant, BranchNetworkService $network): RedirectResponse
    {
        $network->makeCentral($tenant, $request->input('branch_network_code'));

        return back()->with('success', 'Kode jaringan pusat diperbarui.');
    }
}
