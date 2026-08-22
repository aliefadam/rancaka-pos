<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('tenants', 'tenant_type')) {
            Schema::table('tenants', function (Blueprint $table) {
                $table->string('tenant_type', 20)->default('standalone')->after('status')->index();
            });
        }

        if (! Schema::hasColumn('tenants', 'branch_network_code')) {
            Schema::table('tenants', function (Blueprint $table) {
                $table->string('branch_network_code', 30)->nullable()->after('tenant_type')->unique();
            });
        }

        if (! Schema::hasTable('tenant_branch_relationships')) {
            Schema::create('tenant_branch_relationships', function (Blueprint $table) {
                $table->id();
                $table->foreignId('parent_tenant_id')->constrained('tenants')->restrictOnDelete();
                $table->foreignId('branch_tenant_id')->constrained('tenants')->restrictOnDelete();
                $table->string('network_code_used', 30);
                $table->string('status', 40)->index();
                $table->timestamp('requested_at');
                $table->timestamp('parent_approved_at')->nullable();
                $table->foreignId('parent_approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('admin_approved_at')->nullable();
                $table->foreignId('admin_approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('trial_starts_at')->nullable();
                $table->timestamp('trial_ends_at')->nullable();
                $table->timestamp('billing_effective_at')->nullable()->index();
                $table->timestamp('detach_effective_at')->nullable()->index();
                $table->timestamp('requested_exit_at')->nullable();
                $table->text('reason')->nullable();
                $table->text('note')->nullable();
                $table->timestamps();

                $table->index(['parent_tenant_id', 'status']);
                $table->index(['branch_tenant_id', 'status']);
            });
        }

        if (! Schema::hasTable('tenant_branch_status_histories')) {
            Schema::create('tenant_branch_status_histories', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_branch_relationship_id')->constrained()->cascadeOnDelete();
                $table->string('from_status', 40)->nullable();
                $table->string('to_status', 40);
                $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->text('reason')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('billing_invoice_items')) {
            Schema::create('billing_invoice_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('billing_invoice_id')->constrained()->cascadeOnDelete();
                $table->string('type', 30);
                $table->foreignId('branch_tenant_id')->nullable()->constrained('tenants')->restrictOnDelete();
                $table->string('description');
                $table->unsignedInteger('quantity')->default(1);
                $table->unsignedBigInteger('unit_amount');
                $table->unsignedBigInteger('total_amount');
                $table->timestamps();

                $table->unique(['billing_invoice_id', 'branch_tenant_id']);
            });
        }

        DB::table('billing_invoices')
            ->whereNotExists(fn ($query) => $query->selectRaw('1')
                ->from('billing_invoice_items')
                ->whereColumn('billing_invoice_items.billing_invoice_id', 'billing_invoices.id'))
            ->orderBy('id')->chunkById(500, function ($invoices): void {
                $now = now();
                $items = $invoices->map(fn ($invoice) => [
                    'billing_invoice_id' => $invoice->id,
                    'type' => 'central_plan',
                    'branch_tenant_id' => null,
                    'description' => 'Invoice paket legacy',
                    'quantity' => 1,
                    'unit_amount' => $invoice->amount,
                    'total_amount' => $invoice->amount,
                    'created_at' => $now,
                    'updated_at' => $now,
                ])->all();

                if ($items !== []) {
                    DB::table('billing_invoice_items')->insert($items);
                }
            }, 'id');

        if (! Schema::hasTable('tenant_impersonation_logs')) {
            Schema::create('tenant_impersonation_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('parent_tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
                $table->foreignId('branch_tenant_id')->constrained('tenants')->restrictOnDelete();
                $table->foreignId('impersonated_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('started_at');
                $table->timestamp('ended_at')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('type');
                $table->morphs('notifiable');
                $table->text('data');
                $table->timestamp('read_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('tenant_impersonation_logs');
        Schema::dropIfExists('billing_invoice_items');
        Schema::dropIfExists('tenant_branch_status_histories');
        Schema::dropIfExists('tenant_branch_relationships');
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropUnique(['branch_network_code']);
            $table->dropColumn(['tenant_type', 'branch_network_code']);
        });
    }
};
