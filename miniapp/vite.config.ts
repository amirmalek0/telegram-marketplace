import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      host: true,
      port: 3000,
      allowedHosts: env.VITE_ALLOWED_HOSTS?.split(',').map(host => host.trim()).filter(Boolean),
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
        },
        '/storage': {
          target: env.VITE_STORAGE_PROXY_TARGET || 'http://localhost:9000',
          changeOrigin: true,
          headers: { Host: env.VITE_STORAGE_SIGNING_HOST || 'localhost:9000' },
          rewrite: (requestPath) => requestPath.replace(/^\/storage/, ''),
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  }
})
