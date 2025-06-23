import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Create a filtered env object with only VITE_ prefixed variables
  const envWithVitePrefix = Object.fromEntries(
    Object.entries(env).filter(([key]) => key.startsWith('VITE_'))
  )
  
  return {
    plugins: [react(), tailwindcss()],
    server:{
      port: 3000,
    },
    resolve: {
      alias: {
        process: "process/browser",
        stream: "stream-browserify",
        buffer: "buffer"
      }
    },
    define: {
      'process.env': envWithVitePrefix,
      global: {}
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis'
        }
      }
    }
  }
})
