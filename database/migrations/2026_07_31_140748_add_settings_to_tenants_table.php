<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('logo_path')->nullable()->after('address');
            $table->string('receipt_footer')->nullable()->after('logo_path');
            $table->decimal('tax_percentage', 5, 2)->default(0)->after('receipt_footer');
            $table->decimal('service_charge_percentage', 5, 2)->default(0)->after('tax_percentage');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'logo_path',
                'receipt_footer',
                'tax_percentage',
                'service_charge_percentage',
            ]);
        });
    }
};
