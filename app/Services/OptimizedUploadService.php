<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class OptimizedUploadService
{
    private const IMAGE_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/webp',
    ];

    public function store(
        UploadedFile $file,
        string $directory,
        string $disk = 'public',
        int $maxWidth = 1920,
        int $maxHeight = 1920,
        int $quality = 78,
        ?int $targetBytes = null,
    ): string {
        if (! in_array($file->getMimeType(), self::IMAGE_MIME_TYPES, true)) {
            if ($file->getMimeType() !== 'application/pdf') {
                throw new RuntimeException('Tipe file tidak diizinkan.');
            }

            return $file->storeAs(
                $directory,
                Str::uuid().'.pdf',
                $disk,
            );
        }

        return $this->storeImage($file, $directory, $disk, $maxWidth, $maxHeight, $quality, $targetBytes);
    }

    private function storeImage(
        UploadedFile $file,
        string $directory,
        string $disk,
        int $maxWidth,
        int $maxHeight,
        int $quality,
        ?int $targetBytes,
    ): string {
        $contents = file_get_contents($file->getRealPath());
        $source = $contents === false ? false : @imagecreatefromstring($contents);

        if ($source === false) {
            throw new RuntimeException('Gambar tidak dapat diproses.');
        }

        try {
            $source = $this->orientJpeg($source, $file);
            $width = imagesx($source);
            $height = imagesy($source);
            $scale = min(1, $maxWidth / $width, $maxHeight / $height);
            $targetWidth = max(1, (int) round($width * $scale));
            $targetHeight = max(1, (int) round($height * $scale));
            $optimizedContents = $this->encodeImage(
                $source,
                $width,
                $height,
                $targetWidth,
                $targetHeight,
                $quality,
            );

            if ($targetBytes !== null && strlen($optimizedContents) > $targetBytes) {
                $optimizedContents = $this->encodeToTargetSize(
                    $source,
                    $width,
                    $height,
                    $targetWidth,
                    $targetHeight,
                    $targetBytes,
                );
            }
        } finally {
            imagedestroy($source);
        }

        $path = trim($directory, '/').'/'.Str::uuid().'.webp';

        if (! Storage::disk($disk)->put($path, $optimizedContents)) {
            throw new RuntimeException('Gambar gagal disimpan.');
        }

        return $path;
    }

    private function encodeToTargetSize(
        \GdImage $source,
        int $sourceWidth,
        int $sourceHeight,
        int $targetWidth,
        int $targetHeight,
        int $targetBytes,
    ): string {
        $best = '';

        while (true) {
            foreach ([90, 85, 80, 75, 70, 65, 60, 55, 50] as $quality) {
                $encoded = $this->encodeImage(
                    $source,
                    $sourceWidth,
                    $sourceHeight,
                    $targetWidth,
                    $targetHeight,
                    $quality,
                );
                $best = $encoded;

                if (strlen($encoded) <= $targetBytes) {
                    return $encoded;
                }
            }

            if (max($targetWidth, $targetHeight) <= 640) {
                return $best;
            }

            $resizeScale = max(640 / max($targetWidth, $targetHeight), 0.85);
            $targetWidth = max(1, (int) round($targetWidth * $resizeScale));
            $targetHeight = max(1, (int) round($targetHeight * $resizeScale));
        }
    }

    private function encodeImage(
        \GdImage $source,
        int $sourceWidth,
        int $sourceHeight,
        int $targetWidth,
        int $targetHeight,
        int $quality,
    ): string {
        $target = imagecreatetruecolor($targetWidth, $targetHeight);

        if ($target === false) {
            throw new RuntimeException('Gambar tidak dapat dikompresi.');
        }

        try {
            imagealphablending($target, false);
            imagesavealpha($target, true);
            $transparent = imagecolorallocatealpha($target, 0, 0, 0, 127);
            imagefilledrectangle($target, 0, 0, $targetWidth, $targetHeight, $transparent);
            imagecopyresampled(
                $target,
                $source,
                0,
                0,
                0,
                0,
                $targetWidth,
                $targetHeight,
                $sourceWidth,
                $sourceHeight,
            );

            ob_start();
            $encoded = imagewebp($target, null, max(1, min(100, $quality)));
            $contents = ob_get_clean();

            if (! $encoded || ! is_string($contents) || $contents === '') {
                throw new RuntimeException('Gambar tidak dapat dikompresi.');
            }

            return $contents;
        } finally {
            imagedestroy($target);
        }
    }

    private function orientJpeg(\GdImage $image, UploadedFile $file): \GdImage
    {
        if ($file->getMimeType() !== 'image/jpeg' || ! function_exists('exif_read_data')) {
            return $image;
        }

        $exif = @exif_read_data($file->getRealPath());
        $angle = match ($exif['Orientation'] ?? null) {
            3 => 180,
            6 => -90,
            8 => 90,
            default => 0,
        };

        if ($angle === 0) {
            return $image;
        }

        $rotated = imagerotate($image, $angle, 0);

        if ($rotated === false) {
            return $image;
        }

        imagedestroy($image);

        return $rotated;
    }
}
