import { defineConfig } from 'vitest/config';

// Configuración separada para las pruebas de reglas: corren en Node contra los
// emuladores, no dentro del builder de Angular.
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.spec.ts'],
    environment: 'node',
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
