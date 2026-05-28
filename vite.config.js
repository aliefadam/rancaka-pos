import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const devHost = env.VITE_DEV_SERVER_HOST || 'localhost';
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
            cors: {
                origin: [`http://${devHost}`, `http://${devHost}:${devPort}`],
            },
            hmr: {
                host: devHost,
            },
        },
    };
});
