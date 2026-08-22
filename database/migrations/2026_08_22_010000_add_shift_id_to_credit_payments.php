<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('credit_payments', function (Blueprint $table) {
            $table->foreignId('shift_id')
                ->nullable()
                ->after('user_id')
                ->index();
        });

        DB::table('credit_payments')
            ->select(['id', 'tenant_id', 'created_at'])
            ->orderBy('id')
            ->chunkById(100, function ($payments): void {
                foreach ($payments as $payment) {
                    $shiftId = DB::table('shifts')
                        ->where('tenant_id', $payment->tenant_id)
                        ->where('opened_at', '<=', $payment->created_at)
                        ->where(function ($query) use ($payment): void {
                            $query->whereNull('closed_at')
                                ->orWhere('closed_at', '>=', $payment->created_at);
                        })
                        ->latest('opened_at')
                        ->value('id');

                    if ($shiftId !== null) {
                        DB::table('credit_payments')
                            ->where('id', $payment->id)
                            ->update(['shift_id' => $shiftId]);
                    }
                }
            });
    }

    public function down(): void
    {
        Schema::table('credit_payments', function (Blueprint $table) {
            $table->dropIndex(['shift_id']);
            $table->dropColumn('shift_id');
        });
    }
};
