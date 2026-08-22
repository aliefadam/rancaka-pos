<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CommissionPayout;
use App\Models\SalesCommission;
use App\Services\OptimizedUploadService;
use App\Support\UploadRules;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CommissionPayoutController extends Controller
{
    public function store(Request $request, OptimizedUploadService $uploads): RedirectResponse
    {
        $data = $request->validate([
            'commission_ids' => ['required', 'array', 'min:1'],
            'commission_ids.*' => ['integer', 'distinct', 'exists:sales_commissions,id'],
            'proof' => UploadRules::proof(false),
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $proofPath = $request->hasFile('proof')
            ? $uploads->store($request->file('proof'), 'commissions/payouts', 'local')
            : null;

        DB::transaction(function () use ($request, $data, $proofPath) {
            $commissions = SalesCommission::query()
                ->whereIn('id', $data['commission_ids'])
                ->lockForUpdate()
                ->get();

            abort_if($commissions->count() !== count($data['commission_ids']), 422, 'Data komisi tidak lengkap.');
            abort_if($commissions->contains(fn ($commission) => $commission->status !== 'accrued'), 422, 'Salah satu komisi sudah dibayar.');
            abort_if($commissions->pluck('sales_profile_id')->unique()->count() !== 1, 422, 'Satu payout hanya dapat dibuat untuk satu sales.');

            $paidAt = now();
            $payout = CommissionPayout::create([
                'sales_profile_id' => $commissions->first()->sales_profile_id,
                'number' => 'PAY-'.now()->format('YmdHis').'-'.Str::upper(Str::random(5)),
                'amount' => (int) $commissions->sum('commission_amount'),
                'status' => 'paid',
                'paid_at' => $paidAt,
                'proof_path' => $proofPath,
                'note' => $data['note'] ?? null,
                'processed_by' => $request->user()->id,
            ]);
            $payout->commissions()->attach($commissions->modelKeys());

            SalesCommission::query()->whereKey($commissions->modelKeys())->update([
                'status' => 'paid',
                'paid_at' => $paidAt,
                'paid_by' => $request->user()->id,
            ]);
        });

        return back()->with('success', 'Payout komisi berhasil dicatat.');
    }

    public function proof(CommissionPayout $payout): StreamedResponse
    {
        abort_unless($payout->proof_path && Storage::disk('local')->exists($payout->proof_path), 404);

        return Storage::disk('local')->download($payout->proof_path);
    }
}
