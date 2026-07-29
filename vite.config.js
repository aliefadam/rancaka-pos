import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const devHost = env.VITE_DEV_SERVER_HOST || '127.0.0.1';
    const devPort = Number(env.VITE_DEV_SERVER_PORT || 5173);

    return {
        plugins: [
            laravel({
                input: 'resources/js/app.jsx',
                refresh: true,
            }),
            react(),
        ],
        server: {
            host: '0.0.0.0',
            port: devPort,
            strictPort: true,
            origin: `http://${devHost}:${devPort}`,
            // Laravel may be opened through either localhost or 127.0.0.1.
            // Allow the local app to load Vite's ES modules during development.
            cors: true,
            hmr: {
                host: devHost,
            },
        },
    };
});
