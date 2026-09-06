<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\CommissionPayout;
use App\Models\SalesCommission;
use App\Models\SalesProfile;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SalesController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();
        $salesStatus = $request->string('sales_status')->toString();

        $sales = SalesProfile::query()
            ->when($search, fn ($query, $value) => $query->where(fn ($query) => $query
                ->where('name', 'like', "%{$value}%")
                ->orWhere('referral_code', 'like', "%{$value}%")))
            ->when($salesStatus, fn ($query, $value) => $query->where('status', $value))
            ->withCount('tenants')
            ->with('user:id,username')
            ->withSum('commissions as total_commission', 'commission_amount')
            ->withSum(['commissions as accrued_commission' => fn ($query) => $query->where('status', 'accrued')], 'commission_amount')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Sales/Index', [
            'sales' => $sales,
            'filters' => [
                'search' => $search,
                'sales_status' => $salesStatus,
            ],
            'metrics' => [
                'referrals' => Tenant::query()->whereNotNull('referred_by_sales_id')->count(),
            ],
        ]);
    }

    public function commissions(Request $request): Response
    {
        $salesId = $request->integer('sales_id');
        $commissionStatus = $request->string('commission_status')->toString();
        $commissionSearch = $request->string('commission_search')->trim()->toString();
        $dateFrom = $request->date('date_from')?->toDateString();
        $dateTo = $request->date('date_to')?->toDateString();

        $commissions = SalesCommission::query()
            ->with(['salesProfile:id,name,referral_code', 'tenant:id,name', 'invoice:id,number'])
            ->when($salesId, fn ($query, $value) => $query->where('sales_profile_id', $value))
            ->when($commissionStatus, fn ($query, $value) => $query->where('status', $value))
            ->when($commissionSearch, fn ($query, $value) => $query->where(fn ($query) => $query
                ->whereHas('tenant', fn ($query) => $query->where('name', 'like', "%{$value}%"))
                ->orWhereHas('invoice', fn ($query) => $query->where('number', 'like', "%{$value}%"))))
            ->when($dateFrom, fn ($query, $value) => $query->whereDate('approved_at', '>=', $value))
            ->when($dateTo, fn ($query, $value) => $query->whereDate('approved_at', '<=', $value))
            ->latest('approved_at')
            ->paginate(12, ['*'], 'commission_page')
            ->withQueryString();

        return Inertia::render('Admin/Sales/Commissions', [
            'allSales' => SalesProfile::query()->orderBy('name')->get(['id', 'name', 'referral_code', 'status']),
            'commissions' => $commissions,
            'payouts' => CommissionPayout::query()->with('salesProfile:id,name')->latest('paid_at')->limit(10)->get(),
            'filters' => [
                'sales_id' => $salesId ?: '',
                'commission_status' => $commissionStatus,
                'commission_search' => $commissionSearch,
                'date_from' => $dateFrom ?? '',
                'date_to' => $dateTo ?? '',
            ],
            'metrics' => [
                'earned' => (int) SalesCommission::query()->sum('commission_amount'),
                'accrued' => (int) SalesCommission::query()->where('status', 'accrued')->sum('commission_amount'),
                'paid' => (int) SalesCommission::query()->where('status', 'paid')->sum('commission_amount'),
            ],
        ]);
    }

    public function referralCorrection(): Response
    {
        return Inertia::render('Admin/Sales/ReferralCorrection', [
            'eligibleTenants' => $this->eligibleTenants(),
            'allSales' => SalesProfile::query()->orderBy('name')->get(['id', 'name', 'referral_code', 'status']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->merge([
            'referral_code' => SalesProfile::normalizeReferralCode($request->input('referral_code')),
            'commission_type' => $request->input('commission_type', 'percentage'),
        ]);
        $data = $this->validated($request);

        DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'username' => $data['username'],
                'email' => $data['email'] ?? null,
                'password' => Hash::make($data['password']),
                'role' => UserRole::Sales,
                'tenant_id' => null,
            ]);

            SalesProfile::create([
                'user_id' => $user->id,
                'name' => $data['name'],
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'] ?? null,
                'referral_code' => $data['referral_code'],
                'commission_type' => $data['commission_type'],
                'commission_rate' => $data['commission_type'] === 'percentage' ? $data['commission_rate'] : 0,
                'commission_value' => $data['commission_type'] === 'fixed' ? $data['commission_value'] : null,
                'status' => $data['status'],
            ]);
        });

        return back()->with('success', 'Sales berhasil ditambahkan.');
    }

    public function update(Request $request, SalesProfile $salesProfile): RedirectResponse
    {
        $request->merge([
            'referral_code' => SalesProfile::normalizeReferralCode($request->input('referral_code')),
            'commission_type' => $request->input('commission_type', 'percentage'),
        ]);
        $data = $this->validated($request, $salesProfile);

        DB::transaction(function () use ($data, $salesProfile) {
            $user = $salesProfile->user ?? new User;
            $user->fill([
                'name' => $data['name'],
                'username' => $data['username'],
                'email' => $data['email'] ?? null,
                'role' => UserRole::Sales,
                'tenant_id' => null,
            ]);
            if (! empty($data['password'])) {
                $user->password = Hash::make($data['password']);
            }
            $user->save();

            $salesProfile->update([
                'user_id' => $user->id,
                'name' => $data['name'],
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'] ?? null,
                'referral_code' => $data['referral_code'],
                'commission_type' => $data['commission_type'],
                'commission_rate' => $data['commission_type'] === 'percentage' ? $data['commission_rate'] : 0,
                'commission_value' => $data['commission_type'] === 'fixed' ? $data['commission_value'] : null,
                'status' => $data['status'],
            ]);
        });

        return back()->with('success', 'Data sales berhasil diperbarui.');
    }

    public function updateTenantReferral(Request $request, Tenant $tenant): RedirectResponse
    {
        if ($tenant->billingInvoices()->whereHas('payments', fn ($query) => $query->where('status', 'approved'))->exists()) {
            return back()->withErrors(['tenant_id' => 'Referral tidak dapat diubah setelah pembayaran subscription pertama disetujui.']);
        }

        $data = $request->validate([
            'sales_profile_id' => ['nullable', Rule::exists('sales_profiles', 'id')->where('status', 'active')],
        ]);
        $sales = isset($data['sales_profile_id']) ? SalesProfile::findOrFail($data['sales_profile_id']) : null;

        $tenant->update([
            'referred_by_sales_id' => $sales?->id,
            'referral_code_used' => $sales?->referral_code,
            'referred_at' => $sales ? now() : null,
        ]);

        return back()->with('success', 'Atribusi referral tenant diperbarui.');
    }

    private function eligibleTenants()
    {
        return Tenant::query()
            ->whereDoesntHave('billingInvoices.payments', fn ($query) => $query->where('status', 'approved'))
            ->with('referringSales:id,name,referral_code')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'referred_by_sales_id', 'referral_code_used']);
    }

    private function validated(Request $request, ?SalesProfile $salesProfile = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'regex:/^[A-Za-z0-9._-]+$/', Rule::unique('users', 'username')->ignore($salesProfile?->user_id)],
            'email' => ['nullable', 'email', 'max:255'],
            'password' => [Rule::requiredIf(! $salesProfile?->user_id), 'nullable', 'string', 'min:8'],
            'phone' => ['nullable', 'string', 'max:30'],
            'referral_code' => ['required', 'string', 'min:4', 'max:30', 'regex:/^[A-Z0-9_-]+$/', Rule::unique('sales_profiles')->ignore($salesProfile?->id)],
            'commission_type' => ['required', Rule::in(['percentage', 'fixed'])],
            'commission_rate' => ['nullable', Rule::requiredIf($request->input('commission_type') === 'percentage'), 'numeric', 'between:0,100', 'decimal:0,2'],
            'commission_value' => ['nullable', Rule::requiredIf($request->input('commission_type') === 'fixed'), 'integer', 'min:0'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ], [
            'referral_code.regex' => 'Kode referral hanya boleh berisi huruf, angka, dash, dan underscore.',
        ]);
    }
}
