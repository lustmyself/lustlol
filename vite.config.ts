import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

// ES Module ortamında __dirname sorununu çözen güvenli yapı
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.startsWith('/api')) {
              try {
                const serverModule = await import('./server.ts');
                // server.ts'in nasıl export edildiğinden bağımsız olarak (default veya isimli) app'i yakalar
                const expressApp = serverModule.app || serverModule.default;
                
                if (typeof expressApp !== 'function') {
                  throw new Error('API middleware (app) is not a function. server.ts dosyasını kontrol et.');
                }
                
                expressApp(req as any, res as any, next);
              } catch (err) {
                console.error('API middleware error:', err);
                next(err);
              }
            } else {
              next();
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});