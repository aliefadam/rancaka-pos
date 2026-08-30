<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('application_brandings', function (Blueprint $table) {
            $table->string('light_logo_path')->nullable()->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('application_brandings', function (Blueprint $table) {
            $table->dropColumn('light_logo_path');
        });
    }
};
