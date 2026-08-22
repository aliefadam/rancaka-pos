<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_price_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('name');
            $table->unsignedBigInteger('price');
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['product_id', 'name']);
            $table->index(['product_id', 'is_active', 'sort_order']);
        });

        DB::table('products')->orderBy('id')->chunkById(500, function ($products) {
            $now = now();
            DB::table('product_price_options')->insert($products->map(fn ($product) => [
                'product_id' => $product->id,
                'name' => 'Harga utama',
                'price' => $product->price,
                'is_default' => true,
                'is_active' => true,
                'sort_order' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ])->all());
        }, 'id');

        Schema::table('transaction_items', function (Blueprint $table) {
            $table->foreignId('product_price_option_id')
                ->nullable()
                ->after('product_id')
                ->constrained('product_price_options')
                ->nullOnDelete();
            $table->string('price_option_name')->nullable()->after('product_name');
        });
    }

    public function down(): void
    {
        Schema::table('transaction_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('product_price_option_id');
            $table->dropColumn('price_option_name');
        });

        Schema::dropIfExists('product_price_options');
    }
};
