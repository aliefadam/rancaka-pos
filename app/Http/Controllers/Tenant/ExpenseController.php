<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    private const CATEGORIES = [
        'Belanja Bahan',
        'Operasional',
        'Transportasi',
        'Gaji Karyawan',
        'Lain-lain',
    ];

    public function index(Request $request): Response
    {
        $tenantId = $request->user()->tenant_id;
        $search = $request->string('search')->trim()->toString();

        $expenses = Expense::query()
            ->where('tenant_id', $tenantId)
            ->when($search, fn ($query, $search) => $query->where(
                fn ($query) => $query
                    ->where('category', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
            ))
            ->latest('expense_date')
            ->latest('id')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Expense $expense): array => [
                'id' => $expense->id,
                'expense_date' => $expense->expense_date->toDateString(),
                'formatted_date' => $expense->expense_date->translatedFormat('d M Y'),
                'category' => $expense->category,
                'amount' => $expense->amount,
                'formatted_amount' => $this->formatRupiah($expense->amount),
                'description' => $expense->description,
                'receipt_url' => Storage::disk('public')->url($expense->receipt_path),
            ]);

        $monthStart = Carbon::today()->startOfMonth();
        $monthEnd = $monthStart->copy()->addMonth();
        $monthlyTotal = Expense::query()
            ->where('tenant_id', $tenantId)
            ->where('expense_date', '>=', $monthStart)
            ->where('expense_date', '<', $monthEnd)
            ->sum('amount');

        return Inertia::render('Tenant/Expenses/Index', [
            'expenses' => $expenses,
            'filters' => ['search' => $search],
            'categories' => self::CATEGORIES,
            'monthlyTotal' => $this->formatRupiah((int) $monthlyTotal),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validated($request);
        $validated['tenant_id'] = $request->user()->tenant_id;
        $validated['user_id'] = $request->user()->id;
        $validated['receipt_path'] = $request->file('receipt')->store(
            "expenses/{$request->user()->tenant_id}",
            'public',
        );
        unset($validated['receipt']);

        Expense::create($validated);

        return redirect()->route('tenant.expenses.index')
            ->with('success', 'Pengeluaran berhasil ditambahkan.');
    }

    public function update(Request $request, Expense $expense): RedirectResponse
    {
        $this->authorizeTenant($request, $expense);
        $validated = $this->validated($request, true);

        if ($request->hasFile('receipt')) {
            $newReceiptPath = $request->file('receipt')->store(
                "expenses/{$request->user()->tenant_id}",
                'public',
            );
            Storage::disk('public')->delete($expense->receipt_path);
            $validated['receipt_path'] = $newReceiptPath;
        }
        unset($validated['receipt']);

        $expense->update($validated);

        return redirect()->route('tenant.expenses.index')
            ->with('success', 'Pengeluaran berhasil diperbarui.');
    }

    public function destroy(Request $request, Expense $expense): RedirectResponse
    {
        $this->authorizeTenant($request, $expense);

        Storage::disk('public')->delete($expense->receipt_path);
        $expense->delete();

        return redirect()->route('tenant.expenses.index')
            ->with('success', 'Pengeluaran berhasil dihapus.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, bool $updating = false): array
    {
        return $request->validate([
            'expense_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'category' => ['required', Rule::in(self::CATEGORIES)],
            'amount' => ['required', 'integer', 'min:1', 'max:999999999999'],
            'description' => ['required', 'string', 'max:1000'],
            'receipt' => [$updating ? 'nullable' : 'required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:2048'],
        ], [
            'expense_date.date_format' => 'Format tanggal pengeluaran tidak valid.',
            'expense_date.before_or_equal' => 'Tanggal pengeluaran tidak boleh melewati hari ini.',
        ]);
    }

    private function authorizeTenant(Request $request, Expense $expense): void
    {
        abort_unless($expense->tenant_id === $request->user()->tenant_id, 403);
    }

    private function formatRupiah(int $value): string
    {
        return 'Rp '.number_format($value, 0, ',', '.');
    }
}
