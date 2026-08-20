<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\CreditSale;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CreditSaleController extends Controller
{
    public function index(Request $request): Response
    {
        $tenantId = $request->user()->tenant_id;
        $query = CreditSale::where('tenant_id', $tenantId)
            ->with(['customer:id,name', 'transaction:id,invoice_number,total,created_at']);
        if ($search = trim((string) $request->input('search'))) {
            $query->where(fn ($q) => $q->whereHas('customer', fn ($c) => $c->where('name', 'like', "%{$search}%"))
                ->orWhereHas('transaction', fn ($t) => $t->where('invoice_number', 'like', "%{$search}%")));
        }
        if (in_array($request->input('status'), ['outstanding', 'paid'], true)) $query->where('status', $request->input('status'));
        return Inertia::render('Tenant/CreditSales/Index', [
            'creditSales' => $query->latest()->paginate(15)->withQueryString(),
            'filters' => $request->only('search', 'status'),
            'summary' => [
                'outstanding' => CreditSale::where('tenant_id', $tenantId)->where('status', 'outstanding')->selectRaw('COALESCE(SUM(total_amount - paid_amount), 0) total')->value('total'),
                'customers' => CreditSale::where('tenant_id', $tenantId)->where('status', 'outstanding')->distinct('credit_customer_id')->count('credit_customer_id'),
            ],
        ]);
    }

    public function show(Request $request, CreditSale $creditSale): Response
    {
        abort_unless($creditSale->tenant_id === $request->user()->tenant_id, 403);
        return Inertia::render('Tenant/CreditSales/Show', ['creditSale' => $creditSale->load([
            'customer:id,name', 'transaction.items', 'transaction.user:id,name', 'payments.user:id,name',
        ])]);
    }

    public function pay(Request $request, CreditSale $creditSale): RedirectResponse
    {
        abort_unless($creditSale->tenant_id === $request->user()->tenant_id, 403);
        $data = $request->validate(['amount' => ['required', 'integer', 'min:1'], 'note' => ['nullable', 'string', 'max:255']]);
        DB::transaction(function () use ($creditSale, $data, $request) {
            $sale = CreditSale::lockForUpdate()->findOrFail($creditSale->id);
            $remaining = $sale->total_amount - $sale->paid_amount;
            if ($sale->status === 'paid' || $data['amount'] > $remaining) throw ValidationException::withMessages(['amount' => 'Nominal melebihi sisa hutang.']);
            $sale->payments()->create(['tenant_id' => $sale->tenant_id, 'user_id' => $request->user()->id, 'amount' => $data['amount'], 'note' => $data['note'] ?? null]);
            $sale->paid_amount += $data['amount'];
            $sale->status = $sale->paid_amount >= $sale->total_amount ? 'paid' : 'outstanding';
            $sale->save();
        });
        return back()->with('success', 'Pembayaran hutang berhasil dicatat.');
    }
}
