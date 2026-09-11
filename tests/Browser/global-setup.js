import { execFileSync, spawn } from 'node:child_process';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const browserDatabase = resolve('database/playwright.sqlite');
export const browserEnvironment = {
    ...process.env,
    APP_ENV: 'testing',
    DB_CONNECTION: 'sqlite',
    DB_DATABASE: browserDatabase,
    DB_URL: '',
    BCRYPT_ROUNDS: '4',
    CACHE_STORE: 'array',
    SESSION_DRIVER: 'file',
    QUEUE_CONNECTION: 'sync',
};

export default async function globalSetup() {
    if (existsSync(browserDatabase)) unlinkSync(browserDatabase);
    writeFileSync(browserDatabase, '');
    execFileSync('php', ['artisan', 'migrate:fresh', '--force'], { env: browserEnvironment, stdio: 'inherit' });
    execFileSync('php', ['artisan', 'db:seed', '--class=StockTransferBrowserTestSeeder', '--force'], { env: browserEnvironment, stdio: 'inherit' });

    const server = spawn('php', ['-S', '127.0.0.1:8123', '../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php'], {
        cwd: resolve('public'),
        env: browserEnvironment,
        stdio: 'ignore',
        windowsHide: true,
    });

    for (let attempt = 0; attempt < 50; attempt += 1) {
        try {
            await fetch('http://127.0.0.1:8123/login');
            return () => server.kill();
        } catch {
            await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
        }
    }

    server.kill();
    throw new Error('Server browser test tidak dapat dijalankan.');
}
