<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_installment_schedule_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_id')->constrained()->cascadeOnDelete();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('before_schedule');
            $table->json('after_schedule');
            $table->text('reason');
            $table->timestamps();

            $table->index(['tenant_id', 'purchase_id', 'created_at'], 'installment_history_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_installment_schedule_histories');
    }
};
