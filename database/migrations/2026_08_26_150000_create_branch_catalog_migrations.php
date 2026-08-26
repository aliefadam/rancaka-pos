<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->foreignId('source_category_id')
                ->nullable()
                ->after('tenant_id')
                ->constrained('categories')
                ->nullOnDelete();
            $table->unique(['tenant_id', 'source_category_id']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('source_product_id')
                ->nullable()
                ->after('tenant_id')
                ->constrained('products')
                ->nullOnDelete();
            $table->unique(['tenant_id', 'source_product_id']);
        });

        Schema::create('branch_catalog_migrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_branch_relationship_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_tenant_id')->constrained('tenants')->restrictOnDelete();
            $table->foreignId('branch_tenant_id')->constrained('tenants')->restrictOnDelete();
            $table->foreignId('initiated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('categories_created')->default(0);
            $table->unsignedInteger('categories_matched')->default(0);
            $table->unsignedInteger('products_created')->default(0);
            $table->unsignedInteger('products_matched')->default(0);
            $table->unsignedInteger('products_unchanged')->default(0);
            $table->timestamp('completed_at');
            $table->timestamps();

            $table->index(['branch_tenant_id', 'completed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branch_catalog_migrations');

        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'source_product_id']);
            $table->dropConstrainedForeignId('source_product_id');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'source_category_id']);
            $table->dropConstrainedForeignId('source_category_id');
        });
    }
};
