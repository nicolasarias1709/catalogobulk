import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin';

export default defineConfig({
  plugins: [
    vue({ template: { transformAssetUrls } }),
    quasar(),
  ],
  server: {
    proxy: {
      // En desarrollo local, el frontend (puerto 5173) reenvía /api al
      // backend Express (npm run dev, puerto 3000). En producción (Vercel),
      // /api ya vive en el mismo dominio gracias al rewrite en vercel.json.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
