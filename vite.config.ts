import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
    plugins: [react()],
    clearScreen: false,
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    plotly: ['plotly.js-dist-min', 'react-plotly.js']
                }
            }
        }
    },
    server: {
        port: 5173,
        strictPort: true,
        host: '127.0.0.1'
    },
    envPrefix: ['VITE_'],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/test/setup.ts',
        include: ['src/**/*.test.{ts,tsx}'],
        exclude: ['e2e/**']
    }
});
