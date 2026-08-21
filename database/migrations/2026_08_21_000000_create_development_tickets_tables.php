<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('development_tickets', function (Blueprint $table) {
            $table->id();
            $table->string('number')->nullable()->unique();
            $table->string('title');
            $table->string('type', 30);
            $table->string('priority', 30)->default('normal');
            $table->string('status', 30)->default('pending');
            $table->json('description');
            $table->foreignId('tenant_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->date('target_date')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'priority']);
        });

        Schema::create('development_ticket_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('development_ticket_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30);
            $table->json('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('development_ticket_updates');
        Schema::dropIfExists('development_tickets');
    }
};
