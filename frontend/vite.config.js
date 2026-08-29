import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { quasar, transformAssetUrls } from "@quasar/vite-plugin";

// Carpeta raiz del proyecto (donde esta este archivo).
const raizProyecto = fileURLToPath(new URL(".", import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // transformAssetUrls permite que componentes de Quasar (q-img, q-avatar...)
    // resuelvan rutas de /src/assets igual que las etiquetas <img> normales.
    vue({ template: { transformAssetUrls } }),

    // sassVariables: archivo donde se sobreescriben los colores de marca de Quasar.
    quasar({ sassVariables: "src/styles/variables.scss" }),
  ],

  resolve: {
    alias: {
      // "@" apunta siempre a /src -> se acaban los "../../../components/..."
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  css: {
    preprocessorOptions: {
      // El plugin de Quasar inyecta al inicio de cada archivo de estilos un
      // @import 'src/styles/variables.scss' (ruta relativa a la RAIZ). Para que
      // Sass sepa resolverla, se agrega la raiz a sus rutas de busqueda.
      scss: { loadPaths: [raizProyecto] },
      sass: { loadPaths: [raizProyecto] },
    },
  },

  server: {
    // Puerto fijo: es el que hay que autorizar en el CORS del backend
    // (ver README.md, seccion "Hacerlo funcional").
    port: 5173,
    strictPort: true,
  },
});
