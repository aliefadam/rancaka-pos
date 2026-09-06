<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_profiles', function (Blueprint $table) {
            $table->string('commission_type', 20)->default('percentage')->after('referral_code');
            $table->unsignedBigInteger('commission_value')->nullable()->after('commission_rate');
        });

        Schema::table('sales_commissions', function (Blueprint $table) {
            $table->string('commission_type_snapshot', 20)->default('percentage')->after('base_amount');
            $table->unsignedBigInteger('commission_value_snapshot')->nullable()->after('commission_rate_snapshot');
        });
    }

    public function down(): void
    {
        Schema::table('sales_commissions', function (Blueprint $table) {
            $table->dropColumn(['commission_type_snapshot', 'commission_value_snapshot']);
        });

        Schema::table('sales_profiles', function (Blueprint $table) {
            $table->dropColumn(['commission_type', 'commission_value']);
        });
    }
};
