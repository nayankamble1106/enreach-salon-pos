import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function logoUploadPlugin(): Plugin {
  return {
    name: 'logo-upload-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method === 'POST' && req.url === '/api/upload-logo') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const { imageBase64 } = JSON.parse(body);
              if (imageBase64) {
                const base64Clean = imageBase64.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Clean, 'base64');

                const publicDir = path.resolve('public');
                if (!fs.existsSync(publicDir)) {
                  fs.mkdirSync(publicDir, { recursive: true });
                }

                fs.writeFileSync(path.join(publicDir, 'salon-logo.jpg'), buffer);
                fs.writeFileSync(path.join(publicDir, 'icon-512.png'), buffer);
                fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), buffer);
                fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), buffer);
                fs.writeFileSync(path.join(publicDir, 'icon-192.png'), buffer);
                fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), buffer);
                fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), buffer);
                fs.writeFileSync(path.join(publicDir, 'favicon.png'), buffer);
                fs.writeFileSync(path.join(publicDir, 'favicon.ico'), buffer);

                const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image href="data:image/png;base64,${base64Clean}" width="512" height="512" />
</svg>`;
                fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg);

                const distDir = path.resolve('dist');
                if (fs.existsSync(distDir)) {
                  fs.writeFileSync(path.join(distDir, 'salon-logo.png'), buffer);
                  fs.writeFileSync(path.join(distDir, 'icon-512.png'), buffer);
                  fs.writeFileSync(path.join(distDir, 'pwa-512x512.png'), buffer);
                  fs.writeFileSync(path.join(distDir, 'pwa-maskable-512x512.png'), buffer);
                  fs.writeFileSync(path.join(distDir, 'icon-192.png'), buffer);
                  fs.writeFileSync(path.join(distDir, 'pwa-192x192.png'), buffer);
                  fs.writeFileSync(path.join(distDir, 'apple-touch-icon.png'), buffer);
                  fs.writeFileSync(path.join(distDir, 'favicon.png'), buffer);
                  fs.writeFileSync(path.join(distDir, 'favicon.ico'), buffer);
                  fs.writeFileSync(path.join(distDir, 'icon.svg'), svg);
                }
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err: unknown) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), logoUploadPlugin()],
    resolve: {
      alias: {
        '@': path.resolve('.'),
        'react': path.resolve('node_modules/react'),
        'react-dom': path.resolve('node_modules/react-dom'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
