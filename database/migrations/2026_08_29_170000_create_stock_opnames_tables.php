<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_opnames', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('number')->unique();
            $table->date('opname_date')->index();
            $table->string('status', 20)->default('draft')->index();
            $table->text('note')->nullable();
            $table->timestamp('snapshot_at');
            $table->unsignedBigInteger('snapshot_movement_id')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('started_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('started_at')->nullable();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('posted_at')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('cancel_reason')->nullable();
            $table->text('review_note')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'status']);
        });

        Schema::create('stock_opname_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_opname_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->morphs('stockable');
            $table->string('item_name');
            $table->string('item_type', 30)->index();
            $table->string('unit_name', 30);
            $table->decimal('system_stock_snapshot', 18, 4);
            $table->decimal('average_cost_snapshot', 18, 4)->default(0);
            $table->decimal('physical_stock', 18, 4)->nullable();
            $table->foreignId('counted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('counted_at')->nullable();
            $table->decimal('expected_stock_at_count', 18, 4)->nullable();
            $table->decimal('average_cost_at_count', 18, 4)->nullable();
            $table->decimal('variance_quantity', 18, 4)->nullable();
            $table->decimal('variance_value', 22, 4)->nullable();
            $table->decimal('posted_stock_before', 18, 4)->nullable();
            $table->decimal('posted_stock_after', 18, 4)->nullable();
            $table->foreignId('stock_movement_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
            $table->unique(['stock_opname_id', 'stockable_type', 'stockable_id'], 'stock_opname_item_unique');
            $table->index(['stock_opname_id', 'counted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_opname_items');
        Schema::dropIfExists('stock_opnames');
    }
};
