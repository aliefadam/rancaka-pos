<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('receipt_size', 10)->default('58mm')->after('receipt_footer');
            $table->boolean('auto_print_receipt')->default(false)->after('receipt_size');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['receipt_size', 'auto_print_receipt']);
        });
    }
};
