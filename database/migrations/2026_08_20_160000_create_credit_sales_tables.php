<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('credit_customers', function (Blueprint $table) {
            $table->id(); $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name'); $table->timestamps();
            $table->unique(['tenant_id', 'name']);
        });
        Schema::create('credit_sales', function (Blueprint $table) {
            $table->id(); $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('transaction_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('credit_customer_id')->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('total_amount'); $table->unsignedBigInteger('paid_amount')->default(0);
            $table->string('status')->default('outstanding'); $table->timestamps();
            $table->index(['tenant_id', 'status']);
        });
        Schema::create('credit_payments', function (Blueprint $table) {
            $table->id(); $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('credit_sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('amount'); $table->string('note')->nullable(); $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('credit_payments'); Schema::dropIfExists('credit_sales'); Schema::dropIfExists('credit_customers'); }
};
