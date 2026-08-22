<?php

namespace App\Support;

use Closure;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Rules\File;

class UploadRules
{
    private const MAX_SOURCE_IMAGE_KB = 12 * 1024;

    /** @return array<int, mixed> */
    public static function image(bool $required = true): array
    {
        return [
            $required ? 'required' : 'nullable',
            'file',
            'extensions:jpg,jpeg,png,webp',
            File::types(['jpg', 'jpeg', 'png', 'webp'])->max(self::MAX_SOURCE_IMAGE_KB),
            'dimensions:max_width=10000,max_height=10000',
            self::decodableImageRule(),
        ];
    }

    /** @return array<int, mixed> */
    public static function proof(bool $required = true): array
    {
        return [
            $required ? 'required' : 'nullable',
            'file',
            'extensions:jpg,jpeg,png,webp,pdf',
            File::types(['jpg', 'jpeg', 'png', 'webp', 'pdf'])->max(self::MAX_SOURCE_IMAGE_KB),
            self::decodableImageRule(),
            function (string $attribute, mixed $value, Closure $fail): void {
                if ($value instanceof UploadedFile
                    && $value->getMimeType() === 'application/pdf'
                    && $value->getSize() > 2 * 1024 * 1024) {
                    $fail('File PDF maksimal berukuran 2 MB.');
                }
            },
        ];
    }

    private static function decodableImageRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if (! $value instanceof UploadedFile || ! str_starts_with((string) $value->getMimeType(), 'image/')) {
                return;
            }

            $imageInfo = @getimagesize($value->getRealPath());
            $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

            if ($imageInfo === false || ! in_array($imageInfo['mime'] ?? null, $allowedMimeTypes, true)) {
                $fail('Isi file gambar tidak valid atau tidak didukung.');

                return;
            }

            if (($imageInfo[0] * $imageInfo[1]) > 50_000_000) {
                $fail('Resolusi gambar terlalu besar. Maksimal 50 megapiksel.');
            }
        };
    }
}
