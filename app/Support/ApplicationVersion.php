<?php

namespace App\Support;

use InvalidArgumentException;
use RuntimeException;

final class ApplicationVersion
{
    public const DEFAULT = '1.0.0';

    public static function read(string $path): string
    {
        if (! is_file($path)) {
            return self::DEFAULT;
        }

        $version = trim((string) file_get_contents($path));

        self::assertValid($version);

        return $version;
    }

    public static function bump(string $version, string $level): string
    {
        self::assertValid($version);

        [$major, $minor, $patch] = array_map('intval', explode('.', $version));

        return match ($level) {
            'major' => ($major + 1).'.0.0',
            'minor' => $major.'.'.($minor + 1).'.0',
            'patch' => $major.'.'.$minor.'.'.($patch + 1),
            default => throw new InvalidArgumentException(
                'Level versi harus major, minor, atau patch.'
            ),
        };
    }

    public static function write(string $path, string $version): void
    {
        self::assertValid($version);

        if (file_put_contents($path, $version.PHP_EOL, LOCK_EX) === false) {
            throw new RuntimeException("Versi gagal ditulis ke {$path}.");
        }
    }

    public static function assertValid(string $version): void
    {
        if (preg_match('/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/', $version) !== 1) {
            throw new InvalidArgumentException(
                "Versi '{$version}' tidak valid. Gunakan format MAJOR.MINOR.PATCH, misalnya 2.1.0."
            );
        }
    }
}
