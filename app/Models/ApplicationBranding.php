<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

#[Fillable(['light_logo_path', 'white_logo_path', 'app_logo_path', 'updated_by'])]
class ApplicationBranding extends Model
{
    protected $appends = ['light_logo_url', 'white_logo_url', 'app_logo_url'];

    protected function lightLogoUrl(): Attribute
    {
        return Attribute::get(
            fn () => $this->light_logo_path
                ? Storage::disk('public')->url($this->light_logo_path)
                : asset('logo.png'),
        );
    }

    protected function whiteLogoUrl(): Attribute
    {
        return Attribute::get(
            fn () => $this->white_logo_path
                ? Storage::disk('public')->url($this->white_logo_path)
                : $this->light_logo_url,
        );
    }

    protected function appLogoUrl(): Attribute
    {
        return Attribute::get(
            fn () => $this->app_logo_path
                ? Storage::disk('public')->url($this->app_logo_path)
                : asset('pwa/icon-512.png'),
        );
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
