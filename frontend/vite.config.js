import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Куда проксировать запросы /api. В Docker это адрес сервиса backend
// (задаётся переменной окружения), при локальном запуске — localhost:5000.
const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:5000'

// Dev-сервер фронтенда работает на :5173 и проксирует запросы /api на
// Flask-бэкенд. Благодаря прокси браузер считает запросы «same-origin» —
// не нужно настраивать CORS и можно демонстрировать кражу cookie.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // слушать 0.0.0.0 — обязательно для доступа к контейнеру
    port: 5173,
    proxy: {
      '/api': proxyTarget,
    },
  },
})
