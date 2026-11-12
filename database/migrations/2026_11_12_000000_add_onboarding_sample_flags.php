<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->boolean('is_onboarding_sample')->default(false)->after('is_active');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->boolean('is_onboarding_sample')->default(false)->after('is_active');
            $table->index(['tenant_id', 'is_onboarding_sample']);
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'is_onboarding_sample']);
            $table->dropColumn('is_onboarding_sample');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn('is_onboarding_sample');
        });
    }
};
