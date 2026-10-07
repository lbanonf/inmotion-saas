import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    environment: 'node',
    // Las pruebas de reglas necesitan el emulador: npm run test:rules
    exclude: process.env.FIRESTORE_EMULATOR_HOST ? ['node_modules/**'] : ['node_modules/**', 'tests/firestore.rules.test.ts'],
  },
})
