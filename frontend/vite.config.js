import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
    // FORCE VITE TO USE STANDARD MINIFICATION TO BYPASS LIGHTNINGCSS CRASHES
    transformer: 'postcss',
    minify: true
  },
  build: {
    cssMinify: 'esbuild'
  }
});
