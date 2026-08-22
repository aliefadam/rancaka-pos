<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('contact_name')->nullable();
            $table->text('note')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['tenant_id', 'name']);
        });

        Schema::create('purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->string('number')->unique();
            $table->string('supplier_invoice_number')->nullable();
            $table->date('purchase_date')->index();
            $table->string('payment_term', 20);
            $table->date('due_date')->nullable()->index();
            $table->unsignedBigInteger('items_subtotal');
            $table->unsignedBigInteger('discount_amount')->default(0);
            $table->unsignedBigInteger('additional_cost_amount')->default(0);
            $table->string('additional_cost_note')->nullable();
            $table->unsignedBigInteger('total_amount');
            $table->unsignedBigInteger('paid_amount')->default(0);
            $table->unsignedBigInteger('balance_amount');
            $table->string('document_status', 20)->default('posted')->index();
            $table->string('payment_status', 20)->index();
            $table->string('supplier_invoice_path')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('voided_at')->nullable();
            $table->text('void_reason')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'payment_status', 'due_date']);
        });

        Schema::create('purchase_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->nullableMorphs('purchasable');
            $table->string('item_name');
            $table->string('unit_name', 30);
            $table->decimal('quantity', 14, 2);
            $table->decimal('unit_cost', 18, 4);
            $table->unsignedBigInteger('subtotal');
            $table->unsignedBigInteger('allocated_discount')->default(0);
            $table->unsignedBigInteger('allocated_additional_cost')->default(0);
            $table->unsignedBigInteger('inventory_cost_total');
            $table->decimal('inventory_unit_cost', 18, 4);
            $table->timestamps();
            $table->unique(['purchase_id', 'purchasable_type', 'purchasable_id'], 'purchase_item_unique');
        });

        Schema::create('purchase_installments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('sequence');
            $table->date('due_date')->index();
            $table->unsignedBigInteger('planned_amount');
            $table->unsignedBigInteger('paid_amount')->default(0);
            $table->string('status', 20)->default('scheduled');
            $table->string('note')->nullable();
            $table->timestamps();
            $table->unique(['purchase_id', 'sequence']);
        });

        Schema::create('supplier_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->foreignId('purchase_id')->constrained()->restrictOnDelete();
            $table->string('number')->unique();
            $table->date('payment_date')->index();
            $table->unsignedBigInteger('amount');
            $table->string('payment_method', 30);
            $table->string('reference_number')->nullable();
            $table->string('proof_path')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 20)->default('valid')->index();
            $table->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('voided_at')->nullable();
            $table->text('void_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('supplier_payment_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_payment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_installment_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('amount');
            $table->timestamps();
            $table->unique(['supplier_payment_id', 'purchase_installment_id'], 'supplier_payment_installment_unique');
        });

        Schema::table('raw_materials', function (Blueprint $table) {
            $table->decimal('average_cost', 18, 4)->default(0)->after('stock');
            $table->timestamp('opening_cost_confirmed_at')->nullable()->after('average_cost');
            $table->foreignId('opening_cost_confirmed_by')->nullable()->after('opening_cost_confirmed_at')->constrained('users')->nullOnDelete();
        });

        Schema::table('products', function (Blueprint $table) {
            $table->decimal('cost', 18, 4)->default(0)->change();
        });

        Schema::table('transaction_items', function (Blueprint $table) {
            $table->decimal('cost_snapshot', 18, 4)->default(0)->after('unit_price');
            $table->decimal('total_cost_snapshot', 18, 4)->default(0)->after('cost_snapshot');
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->nullableMorphs('reference');
            $table->decimal('stock_before', 14, 2)->nullable();
            $table->decimal('stock_after', 14, 2)->nullable();
            $table->decimal('average_cost_before', 18, 4)->nullable();
            $table->decimal('average_cost_after', 18, 4)->nullable();
            $table->decimal('unit_cost_snapshot', 18, 4)->nullable();
            $table->decimal('total_cost_snapshot', 18, 4)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->unsignedBigInteger('cost')->default(0)->change();
        });
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropMorphs('reference');
            $table->dropColumn(['stock_before', 'stock_after', 'average_cost_before', 'average_cost_after', 'unit_cost_snapshot', 'total_cost_snapshot']);
        });
        Schema::table('transaction_items', fn (Blueprint $table) => $table->dropColumn(['cost_snapshot', 'total_cost_snapshot']));
        Schema::table('raw_materials', function (Blueprint $table) {
            $table->dropConstrainedForeignId('opening_cost_confirmed_by');
            $table->dropColumn(['average_cost', 'opening_cost_confirmed_at']);
        });
        Schema::dropIfExists('supplier_payment_allocations');
        Schema::dropIfExists('supplier_payments');
        Schema::dropIfExists('purchase_installments');
        Schema::dropIfExists('purchase_items');
        Schema::dropIfExists('purchases');
        Schema::dropIfExists('suppliers');
    }
};
