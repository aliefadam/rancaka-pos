<?php

namespace App\Http\Controllers\Tenant;

use App\Enums\PaymentMethod;
use App\Enums\TransactionStatus;
use App\Http\Controllers\Controller;
use App\Models\Shift;
use App\Models\Transaction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ShiftController extends Controller
{
    private const CASH_ROUNDING_UNIT = 100;

    public function open(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'opening_cash' => ['required', 'integer', 'min:0'],
        ]);

        $tenantId = $request->user()->tenant_id;

        if (Shift::where('tenant_id', $tenantId)->whereNull('closed_at')->exists()) {
            return redirect()->route('tenant.pos.index')->with('error', 'Shift sudah dibuka.');
        }

        Shift::create([
            'tenant_id' => $tenantId,
            'user_id' => $request->user()->id,
            'opening_cash' => $validated['opening_cash'],
            'opened_at' => now(),
        ]);

        return redirect()->route('tenant.pos.index')->with('success', 'Shift berhasil dibuka.');
    }

    public function close(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'closing_cash' => ['required', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($request, $validated) {
            $shift = Shift::where('tenant_id', $request->user()->tenant_id)
                ->whereNull('closed_at')
                ->lockForUpdate()
                ->first();

            abort_unless($shift, 404);

            $heldTransactions = Transaction::where('tenant_id', $request->user()->tenant_id)
                ->where('status', TransactionStatus::Held)
                ->lockForUpdate()
                ->get();

            $heldCount = $heldTransactions->count();

            if ($heldCount > 0) {
                throw ValidationException::withMessages([
                    'closing_cash' => "Shift tidak dapat ditutup karena masih ada {$heldCount} transaksi ditahan. Selesaikan atau batalkan transaksi tersebut terlebih dahulu.",
                ]);
            }

            $cashTransactions = $shift->transactions()
                ->where('status', TransactionStatus::Completed)
                ->where('payment_method', PaymentMethod::Cash)
                ->lockForUpdate()
                ->get();

            $cashSales = (int) $cashTransactions->sum('total');
            $debtPayments = (int) $shift->creditPayments()
                ->lockForUpdate()
                ->get()
                ->sum('amount');
            $expectedCash = $shift->opening_cash + $cashSales + $debtPayments;
            $roundedCash = intdiv($expectedCash, self::CASH_ROUNDING_UNIT) * self::CASH_ROUNDING_UNIT;
            $closingCash = (int) $validated['closing_cash'];

            if (! in_array($closingCash, [$expectedCash, $roundedCash], true)) {
                if ($request->user()->hasRestrictedCashierAccess()) {
                    throw ValidationException::withMessages([
                        'closing_cash' => 'Kas aktual belum sesuai dengan saldo sistem atau nominal pembulatan Rp100. Hitung kembali uang tunai fisik di laci.',
                    ]);
                }

                $formattedExpectedCash = number_format($expectedCash, 0, ',', '.');
                $formattedRoundedCash = number_format($roundedCash, 0, ',', '.');

                throw ValidationException::withMessages([
                    'closing_cash' => "Kas aktual harus Rp {$formattedExpectedCash} atau hasil pembulatan turun ke pecahan Rp100, yaitu Rp {$formattedRoundedCash}.",
                ]);
            }
            $shift->update([
                'closing_cash' => $closingCash,
                'closed_at' => now(),
            ]);
        });

        return redirect()->route('tenant.pos.index')->with('success', 'Shift berhasil ditutup.');
    }
}
