<?php

namespace Tests\Feature;

use App\Enums\DevelopmentTicketPriority;
use App\Enums\DevelopmentTicketStatus;
use App\Enums\DevelopmentTicketType;
use App\Enums\UserRole;
use App\Models\DevelopmentTicket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DevelopmentTicketTest extends TestCase
{
    use RefreshDatabase;

    public function test_superadmin_can_create_and_edit_a_ticket_with_a_timeline(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Superadmin]);
        $developer = User::factory()->create(['role' => UserRole::Developer, 'tenant_id' => null]);

        $response = $this->actingAs($admin)->post(route('admin.development-tickets.store'), [
            'title' => 'Tambahkan laporan produk',
            'type' => DevelopmentTicketType::Feature->value,
            'priority' => DevelopmentTicketPriority::High->value,
            'description' => $this->document('Kebutuhan laporan detail.'),
            'assigned_to' => $developer->id,
            'tenant_id' => null,
            'target_date' => '2026-09-01',
        ]);

        $ticket = DevelopmentTicket::query()->firstOrFail();
        $response->assertRedirect(route('admin.development-tickets.show', $ticket));
        $this->assertSame('DEV-00001', $ticket->number);
        $this->assertSame(DevelopmentTicketStatus::Pending, $ticket->status);
        $this->assertSame($developer->id, $ticket->assigned_to);
        $this->assertDatabaseHas('development_ticket_updates', [
            'development_ticket_id' => $ticket->id,
            'from_status' => null,
            'to_status' => DevelopmentTicketStatus::Pending->value,
        ]);

        $this->actingAs($admin)->put(route('admin.development-tickets.update', $ticket), [
            'title' => 'Tambahkan laporan laba produk',
            'type' => DevelopmentTicketType::Improvement->value,
            'priority' => DevelopmentTicketPriority::Urgent->value,
            'description' => $this->document('Kebutuhan sudah diperjelas.'),
            'assigned_to' => $developer->id,
            'tenant_id' => null,
            'target_date' => '2026-09-03',
        ])->assertRedirect(route('admin.development-tickets.show', $ticket));

        $this->assertDatabaseHas('development_tickets', [
            'id' => $ticket->id,
            'title' => 'Tambahkan laporan laba produk',
            'priority' => DevelopmentTicketPriority::Urgent->value,
        ]);
    }

    public function test_developer_can_view_and_update_status_but_cannot_manage_ticket_metadata(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Superadmin]);
        $developer = User::factory()->create(['role' => UserRole::Developer, 'tenant_id' => null]);
        $ticket = $this->ticket($admin, $developer);

        $this->actingAs($developer)
            ->get(route('admin.development-tickets.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/DevelopmentTickets/Index')
                ->where('canManage', false)
                ->has('tickets.data', 1));
        $this->actingAs($developer)
            ->get(route('admin.development-tickets.show', $ticket))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/DevelopmentTickets/Show')
                ->where('ticket.number', 'DEV-00001'));

        $this->actingAs($developer)->post(route('admin.development-tickets.updates.store', $ticket), [
            'status' => DevelopmentTicketStatus::InProgress->value,
            'note' => $this->document('Implementasi dimulai.'),
        ])->assertRedirect();

        $ticket->refresh();
        $this->assertSame(DevelopmentTicketStatus::InProgress, $ticket->status);
        $this->assertNull($ticket->completed_at);
        $this->assertDatabaseHas('development_ticket_updates', [
            'development_ticket_id' => $ticket->id,
            'user_id' => $developer->id,
            'from_status' => DevelopmentTicketStatus::Pending->value,
            'to_status' => DevelopmentTicketStatus::InProgress->value,
        ]);

        $this->actingAs($developer)->get(route('admin.development-tickets.create'))->assertForbidden();
        $this->actingAs($developer)->put(route('admin.development-tickets.update', $ticket), [])->assertForbidden();
        $this->actingAs($developer)->delete(route('admin.development-tickets.destroy', $ticket))->assertForbidden();
        $this->actingAs($developer)->get(route('admin.developers.index'))->assertForbidden();
    }

    public function test_completed_and_revision_updates_manage_completion_timestamp(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Superadmin]);
        $developer = User::factory()->create(['role' => UserRole::Developer]);
        $ticket = $this->ticket($admin, $developer);

        $this->actingAs($developer)->post(route('admin.development-tickets.updates.store', $ticket), [
            'status' => DevelopmentTicketStatus::Completed->value,
            'note' => $this->document('Sudah selesai.'),
        ]);
        $this->assertNotNull($ticket->fresh()->completed_at);

        $this->actingAs($admin)->post(route('admin.development-tickets.updates.store', $ticket), [
            'status' => DevelopmentTicketStatus::Revision->value,
            'note' => $this->document('Mohon perbaiki filter tanggal.'),
        ]);
        $this->assertNull($ticket->fresh()->completed_at);
    }

    public function test_ticket_image_upload_is_limited_to_authorized_images(): void
    {
        Storage::fake('public');
        $developer = User::factory()->create(['role' => UserRole::Developer]);

        $response = $this->actingAs($developer)->post(route('admin.development-tickets.images.store'), [
            'image' => UploadedFile::fake()->image('screenshot.png', 1200, 800)->size(800),
        ]);

        $response->assertCreated()->assertJsonStructure(['url']);
        $this->assertCount(1, Storage::disk('public')->allFiles('development-tickets'));

        $this->actingAs($developer)->post(route('admin.development-tickets.images.store'), [
            'image' => UploadedFile::fake()->create('script.svg', 10, 'image/svg+xml'),
        ])->assertSessionHasErrors('image');
    }

    public function test_superadmin_can_manage_developer_accounts_and_developer_login_redirects_to_tickets(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Superadmin]);

        $this->actingAs($admin)->post(route('admin.developers.store'), [
            'name' => 'Development Team',
            'username' => 'developer.team',
            'email' => 'dev@example.com',
            'password' => 'password-rahasia',
        ])->assertRedirect();

        $developer = User::query()->where('username', 'developer.team')->firstOrFail();
        $this->assertSame(UserRole::Developer, $developer->role);
        $this->assertNull($developer->tenant_id);

        auth()->logout();
        $this->post(route('login'), [
            'username' => 'developer.team',
            'password' => 'password-rahasia',
        ])->assertRedirect(route('admin.development-tickets.index'));
    }

    public function test_tenant_user_cannot_access_development_workspace(): void
    {
        $owner = User::factory()->create(['role' => UserRole::Owner]);
        $this->actingAs($owner)->get(route('admin.development-tickets.index'))->assertForbidden();
    }

    private function ticket(User $admin, User $developer): DevelopmentTicket
    {
        $ticket = DevelopmentTicket::factory()->create([
            'number' => 'DEV-00001',
            'created_by' => $admin->id,
            'assigned_to' => $developer->id,
        ]);
        $ticket->updates()->create([
            'user_id' => $admin->id,
            'to_status' => DevelopmentTicketStatus::Pending,
        ]);

        return $ticket;
    }

    private function document(string $text): array
    {
        return ['type' => 'doc', 'content' => [[
            'type' => 'paragraph',
            'content' => [['type' => 'text', 'text' => $text]],
        ]]];
    }
}
