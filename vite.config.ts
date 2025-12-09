import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
    plugins: [react()],
    clearScreen: false,
    server: {
        port: 5173,
        strictPort: true,
        host: host || '127.0.0.1'
    },
    envPrefix: ['VITE_', 'TAURI_']
});
