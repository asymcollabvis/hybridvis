import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basic_ssl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), basic_ssl()],
})
