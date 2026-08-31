import { defineConfig, loadEnv, createLogger } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = (env.VITE_API_URL || '').trim() || '/api';
  const proxyTarget = (env.VITE_PROXY_TARGET || '').trim() ||
    (apiUrl.startsWith('http') ? apiUrl.replace(/\/api\/?$/, '') : 'http://127.0.0.1:3001');

  const logger = createLogger();
  const originalError = logger.error;
  logger.error = (msg, options) => {
    if (msg.includes('ECONNREFUSED') || msg.includes('ECONNRESET')) return;
    originalError(msg, options);
  };

  return {
    customLogger: logger,
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
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, res) => {
              if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
                if (!res.headersSent) {
                  try {
                    res.writeHead(502, { 'Content-Type': 'text/plain' });
                    res.end('Bad Gateway');
                  } catch (e) {
                    // Ignore
                  }
                }
              }
            });
          }
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
