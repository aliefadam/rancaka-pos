<?php

namespace App\Http\Controllers\Admin;

use App\Enums\DevelopmentTicketPriority;
use App\Enums\DevelopmentTicketStatus;
use App\Enums\DevelopmentTicketType;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\DevelopmentTicket;
use App\Models\Tenant;
use App\Models\User;
use App\Services\OptimizedUploadService;
use App\Support\UploadRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class DevelopmentTicketController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = [
            'search' => $request->string('search')->trim()->toString(),
            'status' => $request->string('status')->toString(),
            'type' => $request->string('type')->toString(),
            'priority' => $request->string('priority')->toString(),
            'assigned_to' => $request->integer('assigned_to') ?: '',
        ];

        $tickets = DevelopmentTicket::query()
            ->with(['tenant:id,name', 'assignee:id,name'])
            ->when($filters['search'], fn ($query, $value) => $query->where(fn ($query) => $query
                ->where('title', 'like', "%{$value}%")
                ->orWhere('number', 'like', "%{$value}%")))
            ->when($filters['status'], fn ($query, $value) => $query->where('status', $value))
            ->when($filters['type'], fn ($query, $value) => $query->where('type', $value))
            ->when($filters['priority'], fn ($query, $value) => $query->where('priority', $value))
            ->when($filters['assigned_to'], fn ($query, $value) => $query->where('assigned_to', $value))
            ->latest('updated_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/DevelopmentTickets/Index', [
            'tickets' => $tickets,
            'filters' => $filters,
            'metrics' => collect(DevelopmentTicketStatus::cases())->mapWithKeys(
                fn ($status) => [$status->value => DevelopmentTicket::query()->where('status', $status)->count()]
            ),
            'developers' => $this->developers(),
            'options' => $this->options(),
            'canManage' => $request->user()->isSuperadmin(),
        ]);
    }

    public function create(Request $request): Response
    {
        $this->ensureSuperadmin($request);

        return Inertia::render('Admin/DevelopmentTickets/Form', [
            'ticket' => null,
            'developers' => $this->developers(),
            'tenants' => Tenant::query()->orderBy('name')->get(['id', 'name']),
            'options' => $this->options(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->ensureSuperadmin($request);
        $data = $this->validatedTicket($request);

        $ticket = DB::transaction(function () use ($data, $request) {
            $ticket = DevelopmentTicket::create([
                ...$data,
                'status' => DevelopmentTicketStatus::Pending,
                'created_by' => $request->user()->id,
            ]);
            $ticket->update(['number' => 'DEV-'.str_pad((string) $ticket->id, 5, '0', STR_PAD_LEFT)]);
            $ticket->updates()->create([
                'user_id' => $request->user()->id,
                'to_status' => DevelopmentTicketStatus::Pending,
            ]);

            return $ticket;
        });

        return redirect()->route('admin.development-tickets.show', $ticket)
            ->with('success', "Tiket {$ticket->number} berhasil dibuat.");
    }

    public function show(Request $request, DevelopmentTicket $developmentTicket): Response
    {
        $developmentTicket->load([
            'tenant:id,name',
            'creator:id,name',
            'assignee:id,name',
            'updates.user:id,name,role',
        ]);

        return Inertia::render('Admin/DevelopmentTickets/Show', [
            'ticket' => $developmentTicket,
            'developers' => $this->developers(),
            'options' => $this->options(),
            'canManage' => $request->user()->isSuperadmin(),
        ]);
    }

    public function edit(Request $request, DevelopmentTicket $developmentTicket): Response
    {
        $this->ensureSuperadmin($request);

        return Inertia::render('Admin/DevelopmentTickets/Form', [
            'ticket' => $developmentTicket->load('tenant:id,name'),
            'developers' => $this->developers(),
            'tenants' => Tenant::query()->orderBy('name')->get(['id', 'name']),
            'options' => $this->options(),
        ]);
    }

    public function update(Request $request, DevelopmentTicket $developmentTicket): RedirectResponse
    {
        $this->ensureSuperadmin($request);
        $developmentTicket->update($this->validatedTicket($request));

        return redirect()->route('admin.development-tickets.show', $developmentTicket)
            ->with('success', 'Detail tiket berhasil diperbarui.');
    }

    public function addUpdate(Request $request, DevelopmentTicket $developmentTicket): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::enum(DevelopmentTicketStatus::class)],
            'note' => ['required', 'array'],
        ]);
        $this->validateDocumentSize($data['note'], 'note');
        $fromStatus = $developmentTicket->status;
        $toStatus = DevelopmentTicketStatus::from($data['status']);

        DB::transaction(function () use ($developmentTicket, $request, $data, $fromStatus, $toStatus) {
            $developmentTicket->update([
                'status' => $toStatus,
                'completed_at' => $toStatus === DevelopmentTicketStatus::Completed
                    ? ($developmentTicket->completed_at ?? now())
                    : null,
            ]);
            $developmentTicket->updates()->create([
                'user_id' => $request->user()->id,
                'from_status' => $fromStatus,
                'to_status' => $toStatus,
                'note' => $data['note'],
            ]);
        });

        return back()->with('success', 'Update pengerjaan berhasil ditambahkan.');
    }

    public function destroy(Request $request, DevelopmentTicket $developmentTicket): RedirectResponse
    {
        $this->ensureSuperadmin($request);
        $number = $developmentTicket->number;
        $developmentTicket->delete();

        return redirect()->route('admin.development-tickets.index')
            ->with('success', "Tiket {$number} berhasil dihapus.");
    }

    public function uploadImage(Request $request, OptimizedUploadService $uploads): JsonResponse
    {
        $data = $request->validate([
            'image' => UploadRules::image(),
        ]);
        $path = $uploads->store($data['image'], 'development-tickets/'.now()->format('Y/m'));

        return response()->json(['url' => Storage::disk('public')->url($path)], 201);
    }

    private function validatedTicket(Request $request): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::enum(DevelopmentTicketType::class)],
            'priority' => ['required', Rule::enum(DevelopmentTicketPriority::class)],
            'description' => ['required', 'array'],
            'tenant_id' => ['nullable', 'integer', 'exists:tenants,id'],
            'assigned_to' => [
                'nullable',
                Rule::exists('users', 'id')->where('role', UserRole::Developer->value),
            ],
            'target_date' => ['nullable', 'date'],
        ]);
        $this->validateDocumentSize($data['description'], 'description');

        return $data;
    }

    private function validateDocumentSize(array $document, string $field): void
    {
        if (($document['type'] ?? null) !== 'doc' || ! is_array($document['content'] ?? null)) {
            throw ValidationException::withMessages([$field => 'Format konten tidak valid.']);
        }

        if (strlen((string) json_encode($document)) > 2_000_000) {
            throw ValidationException::withMessages([$field => 'Konten terlalu besar.']);
        }

        $hasContent = function (array $node) use (&$hasContent): bool {
            if (($node['type'] ?? null) === 'image' || trim((string) ($node['text'] ?? '')) !== '') {
                return true;
            }

            return collect($node['content'] ?? [])->contains(
                fn ($child) => is_array($child) && $hasContent($child)
            );
        };

        if (! $hasContent($document)) {
            throw ValidationException::withMessages([$field => 'Konten wajib diisi.']);
        }
    }

    private function ensureSuperadmin(Request $request): void
    {
        abort_unless($request->user()->isSuperadmin(), 403);
    }

    private function developers()
    {
        return User::query()->where('role', UserRole::Developer)->orderBy('name')->get(['id', 'name', 'username']);
    }

    private function options(): array
    {
        $map = fn ($cases) => collect($cases)->map(fn ($case) => [
            'value' => $case->value,
            'label' => $case->label(),
        ])->values();

        return [
            'statuses' => $map(DevelopmentTicketStatus::cases()),
            'types' => $map(DevelopmentTicketType::cases()),
            'priorities' => $map(DevelopmentTicketPriority::cases()),
        ];
    }
}
