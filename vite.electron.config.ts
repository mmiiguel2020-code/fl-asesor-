import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/electron/main.ts'),
      formats: ['cjs'],
    },
    outDir: 'dist/electron',
    minify: 'terser',
    sourcemap: true,
    rollupOptions: {
      external: ['electron', 'better-sqlite3'],
      output: {
        entryFileNames: 'main.cjs',
      },
    },
  },
});
