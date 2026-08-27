<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id', 'supplier_id', 'number', 'supplier_invoice_number', 'purchase_date', 'payment_term', 'due_date',
    'items_subtotal', 'discount_amount', 'additional_cost_amount', 'additional_cost_note', 'total_amount',
    'paid_amount', 'balance_amount', 'document_status', 'payment_status', 'supplier_invoice_path', 'note',
    'created_by', 'voided_by', 'voided_at', 'void_reason',
])]
class Purchase extends Model
{
    protected function casts(): array
    {
        return ['purchase_date' => 'date', 'due_date' => 'date', 'voided_at' => 'datetime'];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function voider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function installments(): HasMany
    {
        return $this->hasMany(PurchaseInstallment::class)->orderBy('sequence');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SupplierPayment::class);
    }

    public function installmentScheduleHistories(): HasMany
    {
        return $this->hasMany(PurchaseInstallmentScheduleHistory::class)->latest();
    }

    public function isOverdue(): bool
    {
        return $this->document_status === 'posted' && $this->balance_amount > 0 && $this->due_date?->isBefore(today());
    }
}
