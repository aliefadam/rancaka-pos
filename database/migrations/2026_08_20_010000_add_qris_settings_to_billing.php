<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('billing_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('qris_enabled')->default(false);
            $table->string('qris_merchant_name')->nullable();
            $table->string('qris_image_path')->nullable();
            $table->timestamps();
        });

        DB::table('billing_settings')->insert([
            'qris_enabled' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Schema::table('subscription_payments', function (Blueprint $table) {
            $table->string('payment_method')->default('bank_transfer')->after('amount');
        });
    }

    public function down(): void
    {
        Schema::table('subscription_payments', function (Blueprint $table) {
            $table->dropColumn('payment_method');
        });

        Schema::dropIfExists('billing_settings');
    }
};
