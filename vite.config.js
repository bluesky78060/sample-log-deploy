import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'src',
  base: './',
  server: {
    port: 3001,
    open: true
  },
  resolve: {
    extensions: ['.ts', '.js', '.mjs', '.json']
  },
  build: {
    outDir: '../docs',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        soil: resolve(__dirname, 'src/soil/index.html'),
        water: resolve(__dirname, 'src/water/index.html'),
        compost: resolve(__dirname, 'src/compost/index.html'),
        heavyMetal: resolve(__dirname, 'src/heavy-metal/index.html'),
        pesticide: resolve(__dirname, 'src/pesticide/index.html'),
        settings: resolve(__dirname, 'src/settings/index.html'),
        labelPrint: resolve(__dirname, 'src/label-print/index.html'),
        manual: resolve(__dirname, 'src/manual/index.html')
      }
    }
  }
})
