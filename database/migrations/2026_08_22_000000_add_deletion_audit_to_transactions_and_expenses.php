<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('voided_by')->nullable()->after('status')->constrained('users')->nullOnDelete();
            $table->timestamp('voided_at')->nullable()->after('voided_by');
            $table->string('void_reason', 500)->nullable()->after('voided_at');
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->foreignId('deleted_by')->nullable()->after('user_id')->constrained('users')->nullOnDelete();
            $table->string('delete_reason', 500)->nullable()->after('deleted_by');
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('deleted_by');
            $table->dropColumn('delete_reason');
            $table->dropSoftDeletes();
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('voided_by');
            $table->dropColumn(['voided_at', 'void_reason']);
        });
    }
};
