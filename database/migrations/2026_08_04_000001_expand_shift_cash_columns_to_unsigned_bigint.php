<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shifts', function (Blueprint $table) {
            $table->unsignedBigInteger('opening_cash')->default(0)->change();
            $table->unsignedBigInteger('closing_cash')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('shifts', function (Blueprint $table) {
            $table->unsignedInteger('opening_cash')->default(0)->change();
            $table->unsignedInteger('closing_cash')->nullable()->change();
        });
    }
};
