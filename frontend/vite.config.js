import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = (env.VITE_API_URL || '').trim() || '/api';
  const proxyTarget = (env.VITE_PROXY_TARGET || '').trim() ||
    (apiUrl.startsWith('http') ? apiUrl.replace(/\/api\/?$/, '') : 'http://127.0.0.1:3001');

  return {
    plugins: [react()],

    server: {
      host: true,
      port: 5174,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'jspdf', 'jspdf-autotable', 'xlsx'],
      rolldownOptions: {
        external: [],
      },
    },

    test: {
      environment: 'jsdom',
    },
  };
});
