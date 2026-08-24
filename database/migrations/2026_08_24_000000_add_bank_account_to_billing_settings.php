<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('billing_settings', function (Blueprint $table) {
            $table->string('bank_name')->nullable()->after('qris_image_path');
            $table->string('bank_account')->nullable()->after('bank_name');
            $table->string('bank_holder')->nullable()->after('bank_account');
        });

        DB::table('billing_settings')->update([
            'bank_name' => config('billing.bank_name'),
            'bank_account' => config('billing.bank_account'),
            'bank_holder' => config('billing.bank_holder'),
        ]);
    }

    public function down(): void
    {
        Schema::table('billing_settings', function (Blueprint $table) {
            $table->dropColumn(['bank_name', 'bank_account', 'bank_holder']);
        });
    }
};
