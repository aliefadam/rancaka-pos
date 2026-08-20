<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('referral_code', 30)->unique();
            $table->decimal('commission_rate', 5, 2);
            $table->string('status')->default('active');
            $table->timestamps();
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->foreignId('referred_by_sales_id')->nullable()->after('status')->constrained('sales_profiles')->nullOnDelete();
            $table->string('referral_code_used', 30)->nullable()->after('referred_by_sales_id');
            $table->timestamp('referred_at')->nullable()->after('referral_code_used');
        });

        Schema::create('sales_commissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_profile_id')->constrained()->restrictOnDelete();
            $table->foreignId('tenant_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('billing_invoice_id')->constrained()->restrictOnDelete();
            $table->foreignId('subscription_payment_id')->unique()->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('base_amount');
            $table->decimal('commission_rate_snapshot', 5, 2);
            $table->unsignedBigInteger('commission_amount');
            $table->string('status')->default('accrued');
            $table->timestamp('approved_at');
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('paid_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::create('commission_payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_profile_id')->constrained()->restrictOnDelete();
            $table->string('number')->unique();
            $table->unsignedBigInteger('amount');
            $table->string('status')->default('paid');
            $table->timestamp('paid_at');
            $table->string('proof_path')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('commission_payout_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('commission_payout_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sales_commission_id')->unique()->constrained()->restrictOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commission_payout_items');
        Schema::dropIfExists('commission_payouts');
        Schema::dropIfExists('sales_commissions');

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropConstrainedForeignId('referred_by_sales_id');
            $table->dropColumn(['referral_code_used', 'referred_at']);
        });

        Schema::dropIfExists('sales_profiles');
    }
};
