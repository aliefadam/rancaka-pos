<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['supplier_payment_id', 'purchase_installment_id', 'amount'])]
class SupplierPaymentAllocation extends Model
{
    public function payment(): BelongsTo
    {
        return $this->belongsTo(SupplierPayment::class, 'supplier_payment_id');
    }

    public function installment(): BelongsTo
    {
        return $this->belongsTo(PurchaseInstallment::class, 'purchase_installment_id');
    }
}
