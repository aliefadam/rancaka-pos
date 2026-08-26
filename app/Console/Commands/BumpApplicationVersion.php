<?php

namespace App\Console\Commands;

use App\Support\ApplicationVersion;
use Illuminate\Console\Command;
use InvalidArgumentException;

class BumpApplicationVersion extends Command
{
    protected $signature = 'app:version
                            {level? : Level kenaikan: major, minor, atau patch}
                            {--set= : Tetapkan nomor versi tertentu, misalnya 2.1.0}';

    protected $description = 'Tampilkan atau naikkan versi aplikasi';

    public function handle(): int
    {
        $path = base_path('VERSION');

        try {
            $current = ApplicationVersion::read($path);
            $level = $this->argument('level');
            $exactVersion = $this->option('set');

            if ($level === null && $exactVersion === null) {
                $this->line("Versi aplikasi: <info>{$current}</info>");

                return self::SUCCESS;
            }

            if ($level !== null && $exactVersion !== null) {
                $this->error('Gunakan level atau opsi --set, bukan keduanya.');

                return self::INVALID;
            }

            $next = $exactVersion !== null
                ? (string) $exactVersion
                : ApplicationVersion::bump($current, strtolower((string) $level));

            ApplicationVersion::write($path, $next);
            config(['app.version' => $next]);

            if (app()->configurationIsCached()) {
                $this->callSilent('config:clear');
            }

            $this->info("Versi aplikasi berhasil diperbarui: {$current} -> {$next}");

            return self::SUCCESS;
        } catch (InvalidArgumentException $exception) {
            $this->error($exception->getMessage());

            return self::INVALID;
        }
    }
}
