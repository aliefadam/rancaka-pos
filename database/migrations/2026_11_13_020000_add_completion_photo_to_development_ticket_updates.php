<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('development_ticket_updates', function (Blueprint $table) {
            $table->string('completion_photo_path')->nullable()->after('note');
        });
    }

    public function down(): void
    {
        Schema::table('development_ticket_updates', function (Blueprint $table) {
            $table->dropColumn('completion_photo_path');
        });
    }
};
