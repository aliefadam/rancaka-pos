<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('business_type', 30)->default('retail')->after('status');
            $table->string('interface_mode', 20)->default('complete')->after('business_type');
            $table->json('enabled_modules')->nullable()->after('interface_mode');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['business_type', 'interface_mode', 'enabled_modules']);
        });
    }
};
