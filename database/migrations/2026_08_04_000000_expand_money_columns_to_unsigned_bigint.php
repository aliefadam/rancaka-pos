<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->unsignedBigInteger('price')->default(0)->change();
        });

        Schema::table('transaction_items', function (Blueprint $table) {
            $table->unsignedBigInteger('unit_price')->change();
            $table->unsignedBigInteger('subtotal')->change();
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->unsignedBigInteger('subtotal')->default(0)->change();
            $table->unsignedBigInteger('additional_fee')->default(0)->change();
            $table->unsignedBigInteger('total')->default(0)->change();
            $table->unsignedBigInteger('amount_received')->nullable()->change();
            $table->unsignedBigInteger('change_amount')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->unsignedInteger('price')->default(0)->change();
        });

        Schema::table('transaction_items', function (Blueprint $table) {
            $table->unsignedInteger('unit_price')->change();
            $table->unsignedInteger('subtotal')->change();
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->unsignedInteger('subtotal')->default(0)->change();
            $table->unsignedInteger('additional_fee')->default(0)->change();
            $table->unsignedInteger('total')->default(0)->change();
            $table->unsignedInteger('amount_received')->nullable()->change();
            $table->unsignedInteger('change_amount')->nullable()->change();
        });
    }
};
