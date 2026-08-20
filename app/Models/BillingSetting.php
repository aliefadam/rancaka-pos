<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

#[Fillable(['qris_enabled', 'qris_merchant_name', 'qris_image_path'])]
class BillingSetting extends Model
{
    protected $appends = ['qris_image_url'];

    protected function casts(): array
    {
        return ['qris_enabled' => 'boolean'];
    }

    protected function qrisImageUrl(): Attribute
    {
        return Attribute::get(fn () => $this->qris_image_path
            ? Storage::disk('public')->url($this->qris_image_path)
            : null);
    }
}
