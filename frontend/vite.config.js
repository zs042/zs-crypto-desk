import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // ADJUST THE CHUNK LIMIT THRESHOLD TO 1000 KB TO CLEAR THE CHARTING LIBRARY WARNING
    chunkSizeWarningLimit: 1000,
  },
});
