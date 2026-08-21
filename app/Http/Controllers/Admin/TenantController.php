<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TenantController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $status = $request->string('status')->toString();

        $tenants = Tenant::query()
            ->when($search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->when($status, fn ($query, $status) => $query->where('status', $status))
            ->with('owner:id,tenant_id')
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(function (Tenant $tenant) {
                $canImpersonate = $tenant->owner !== null;

                return [
                    ...$tenant->makeHidden('owner')->toArray(),
                    'can_impersonate' => $canImpersonate,
                    'can_reset_password' => $canImpersonate,
                ];
            });

        return Inertia::render('Admin/Tenants/Index', [
            'tenants' => $tenants,
            'filters' => ['search' => $search, 'status' => $status],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validated($request);

        $ownerCredentials = $request->validate([
            'owner_username' => ['required', 'string', 'max:255', 'unique:users,username'],
            'owner_password' => ['required', 'string', 'min:8'],
        ]);

        DB::transaction(function () use ($validated, $ownerCredentials) {
            $tenant = Tenant::create($validated);

            User::create([
                'name' => $tenant->name,
                'username' => $ownerCredentials['owner_username'],
                'password' => Hash::make($ownerCredentials['owner_password']),
                'role' => UserRole::Owner,
                'tenant_id' => $tenant->id,
            ]);
        });

        return redirect()->route('admin.tenants.index')->with('success', 'Tenant berhasil ditambahkan.');
    }

    public function show(Tenant $tenant): Response
    {
        $completedTransactions = Transaction::query()
            ->where('tenant_id', $tenant->id)
            ->where('status', 'completed');
        $monthStart = now()->startOfMonth();
        $todayStart = now()->startOfDay();
        $trendStart = now()->subDays(29)->startOfDay();

        $salesRows = (clone $completedTransactions)
            ->where('created_at', '>=', $trendStart)
            ->get(['created_at', 'total']);
        $salesByDate = $salesRows
            ->groupBy(fn (Transaction $transaction) => $transaction->created_at->toDateString())
            ->map(fn ($rows) => (int) $rows->sum('total'));
        $salesTrend = collect(CarbonPeriod::create($trendStart, now()->startOfDay()))
            ->map(fn (Carbon $date) => [
                'date' => $date->translatedFormat('d M'),
                'value' => $salesByDate->get($date->toDateString(), 0),
            ])
            ->values();

        $allTimeRevenue = (int) (clone $completedTransactions)->sum('total');
        $allTimeTransactions = (int) (clone $completedTransactions)->count();
        $monthRevenue = (int) (clone $completedTransactions)->where('created_at', '>=', $monthStart)->sum('total');
        $monthTransactions = (int) (clone $completedTransactions)->where('created_at', '>=', $monthStart)->count();
        $todayRevenue = (int) (clone $completedTransactions)->where('created_at', '>=', $todayStart)->sum('total');

        $paymentMethods = (clone $completedTransactions)
            ->select('payment_method', DB::raw('COUNT(*) as transaction_count'), DB::raw('SUM(total) as revenue'))
            ->groupBy('payment_method')
            ->get()
            ->map(fn (Transaction $row) => [
                'method' => $row->payment_method->value,
                'transactions' => (int) $row->transaction_count,
                'revenue' => (int) $row->revenue,
            ]);

        $topProducts = TransactionItem::query()
            ->whereHas('transaction', fn ($query) => $query
                ->where('tenant_id', $tenant->id)
                ->where('status', 'completed'))
            ->select('product_name', DB::raw('SUM(quantity) as sold'), DB::raw('SUM(subtotal) as revenue'))
            ->groupBy('product_name')
            ->orderByDesc('sold')
            ->limit(8)
            ->get()
            ->map(fn (TransactionItem $item) => [
                'name' => $item->product_name,
                'sold' => (int) $item->sold,
                'revenue' => (int) $item->revenue,
            ]);

        $tenant->load([
            'subscription',
            'users' => fn ($query) => $query->latest()->select('id', 'tenant_id', 'name', 'username', 'email', 'role', 'created_at'),
            'billingInvoices' => fn ($query) => $query->with('payments')->latest()->limit(10),
        ]);

        return Inertia::render('Admin/Tenants/Show', [
            'tenant' => $tenant->only(['id', 'name', 'email', 'phone', 'address', 'status', 'logo_url', 'created_at']),
            'subscription' => $tenant->subscription,
            'accounts' => $tenant->users,
            'invoices' => $tenant->billingInvoices,
            'metrics' => [
                'all_time_revenue' => $allTimeRevenue,
                'all_time_transactions' => $allTimeTransactions,
                'average_order' => $allTimeTransactions > 0 ? (int) round($allTimeRevenue / $allTimeTransactions) : 0,
                'month_revenue' => $monthRevenue,
                'month_transactions' => $monthTransactions,
                'today_revenue' => $todayRevenue,
                'products' => $tenant->products()->count(),
                'categories' => $tenant->categories()->count(),
                'employees' => $tenant->users()->where('role', 'employee')->count(),
                'open_shifts' => $tenant->shifts()->whereNull('closed_at')->count(),
                'month_expenses' => (int) $tenant->expenses()->where('expense_date', '>=', $monthStart->toDateString())->sum('amount'),
                'items_sold' => (int) TransactionItem::query()
                    ->whereHas('transaction', fn ($query) => $query->where('tenant_id', $tenant->id)->where('status', 'completed'))
                    ->sum('quantity'),
            ],
            'salesTrend' => $salesTrend,
            'paymentMethods' => $paymentMethods,
            'topProducts' => $topProducts,
            'recentTransactions' => (clone $completedTransactions)
                ->with('user:id,name')
                ->latest()
                ->limit(10)
                ->get(['id', 'user_id', 'invoice_number', 'payment_method', 'total', 'created_at']),
            'recentShifts' => $tenant->shifts()
                ->with('user:id,name')
                ->latest('opened_at')
                ->limit(8)
                ->get(['id', 'user_id', 'opening_cash', 'closing_cash', 'opened_at', 'closed_at']),
        ]);
    }

    public function update(Request $request, Tenant $tenant): RedirectResponse
    {
        $validated = $this->validated($request, $tenant);

        $tenant->update($validated);

        return redirect()->route('admin.tenants.index')->with('success', 'Tenant berhasil diperbarui.');
    }

    public function resetPassword(Tenant $tenant): RedirectResponse
    {
        $owner = $tenant->owner()->first();

        if (! $owner) {
            return back()->with('error', 'Password tidak dapat direset karena tenant belum memiliki akun owner.');
        }

        $owner->update([
            'password' => Hash::make('123123123'),
        ]);

        return back()->with('success', "Password owner tenant {$tenant->name} berhasil direset menjadi 123123123.");
    }

    public function destroy(Tenant $tenant): RedirectResponse
    {
        $tenant->delete();

        return redirect()->route('admin.tenants.index')->with('success', 'Tenant berhasil dihapus.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Tenant $tenant = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required', 'string', 'email', 'max:255',
                Rule::unique('tenants', 'email')->ignore($tenant?->id),
            ],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:500'],
            'status' => ['required', 'in:active,inactive'],
        ]);
    }
}
