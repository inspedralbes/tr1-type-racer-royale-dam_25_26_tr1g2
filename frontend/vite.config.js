import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // ----------------------------------------------------------------
  // SOLUCIÓ PER A LIVE SHARE
  server: {
    // Estableix 'host: true' per enllaçar-se a totes les interfícies (0.0.0.0).
    // Això és essencial perquè Live Share o qualsevol altra eina de túnel
    // pugui exposar el servidor de desenvolupament als convidats.
    host: true,
  }
  // ----------------------------------------------------------------
})