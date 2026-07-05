import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import SetupExtend from 'vite-plugin-vue-setup-extend'
import tailwindcss from '@tailwindcss/vite'
import Icons from 'unplugin-icons/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'lord-icon'
        }
      }
    }),
    SetupExtend(),
    tailwindcss(),
    Icons({
      compiler: 'vue3',
      autoInstall: true
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
