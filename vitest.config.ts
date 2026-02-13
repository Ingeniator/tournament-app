import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['e2e/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['packages/runner/src/**'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/node_modules/**'],
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage/unit',
    },
  },
});
