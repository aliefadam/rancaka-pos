<?php

namespace App\Models;

use App\Enums\DevelopmentTicketStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

#[Fillable(['development_ticket_id', 'user_id', 'from_status', 'to_status', 'note', 'completion_photo_path', 'completion_photo_paths'])]
class DevelopmentTicketUpdate extends Model
{
    protected $appends = ['completion_photo_urls'];

    protected $hidden = ['completion_photo_path', 'completion_photo_paths'];

    protected function casts(): array
    {
        return [
            'from_status' => DevelopmentTicketStatus::class,
            'to_status' => DevelopmentTicketStatus::class,
            'note' => 'array',
            'completion_photo_paths' => 'array',
        ];
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(DevelopmentTicket::class, 'development_ticket_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return array<int, string> */
    public function getCompletionPhotoUrlsAttribute(): array
    {
        $paths = $this->completion_photo_paths ?? [];

        if ($this->completion_photo_path) {
            $paths[] = $this->completion_photo_path;
        }

        return collect($paths)
            ->filter()
            ->unique()
            ->map(fn (string $path) => Storage::disk('public')->url($path))
            ->values()
            ->all();
    }
}
