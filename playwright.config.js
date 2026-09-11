import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/Browser',
    globalSetup: './tests/Browser/global-setup.js',
    timeout: 60_000,
    retries: 0,
    workers: 1,
    use: {
        baseURL: 'http://127.0.0.1:8123',
        browserName: 'chromium',
        channel: 'chromium',
        headless: true,
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
    },
});
