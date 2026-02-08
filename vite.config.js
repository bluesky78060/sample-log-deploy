import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'src',
  base: './',
  server: {
    port: 3000,
    open: true
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
        labelPrint: resolve(__dirname, 'src/label-print/index.html')
      }
    }
  }
})
