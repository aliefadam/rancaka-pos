<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['billing_invoice_id', 'type', 'branch_tenant_id', 'description', 'quantity', 'unit_amount', 'total_amount'])]
class BillingInvoiceItem extends Model
{
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(BillingInvoice::class, 'billing_invoice_id');
    }

    public function branchTenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'branch_tenant_id');
    }
}
