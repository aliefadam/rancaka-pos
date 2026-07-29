<?php

namespace App\Http\Controllers\Tenant\Reports;

use App\Enums\TransactionStatus;
use App\Http\Controllers\Controller;
use App\Models\Shift;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ShiftHistoryController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $status = $request->string('status')->toString();

        $shifts = Shift::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->with('user:id,name')
            ->withCount(['transactions as transaction_count' => function ($query) {
                $query->where('status', TransactionStatus::Completed);
            }])
            ->withSum(['transactions as total_sales' => function ($query) {
                $query->where('status', TransactionStatus::Completed);
            }], 'total')
            ->when($search, function ($query, $search) {
                $query->whereHas('user', fn ($q) => $q->where('name', 'like', "%{$search}%"));
            })
            ->when($status === 'open', fn ($query) => $query->whereNull('closed_at'))
            ->when($status === 'closed', fn ($query) => $query->whereNotNull('closed_at'))
            ->latest('opened_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Tenant/Reports/Shifts/Index', [
            'shifts' => $shifts,
            'filters' => ['search' => $search, 'status' => $status],
        ]);
    }
}
