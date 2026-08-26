<?php

namespace Tests\Unit;

use App\Support\ApplicationVersion;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class ApplicationVersionTest extends TestCase
{
    #[DataProvider('versionBumps')]
    public function test_it_bumps_semantic_versions(string $current, string $level, string $expected): void
    {
        $this->assertSame($expected, ApplicationVersion::bump($current, $level));
    }

    public static function versionBumps(): array
    {
        return [
            'major' => ['1.4.3', 'major', '2.0.0'],
            'minor' => ['2.0.1', 'minor', '2.1.0'],
            'patch' => ['2.0.0', 'patch', '2.0.1'],
        ];
    }

    public function test_it_rejects_an_invalid_version(): void
    {
        $this->expectException(InvalidArgumentException::class);

        ApplicationVersion::assertValid('1.0');
    }

    public function test_it_rejects_an_unknown_bump_level(): void
    {
        $this->expectException(InvalidArgumentException::class);

        ApplicationVersion::bump('1.0.0', 'feature');
    }
}
