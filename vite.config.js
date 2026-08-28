import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 讓外部工具用 PORT 環境變數指定連接埠；沒指定時用 Vite 預設 5173
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
})
