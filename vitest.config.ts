import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['e2e/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['packages/runner/src/**', 'packages/common/src/**', 'packages/planner/src/**'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/node_modules/**',
        '**/*.module.css',
        '**/i18n/**',
        '**/types.ts',
        '**/*.bench.ts',
      ],
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage/unit',
      thresholds: {
        'packages/runner/src/**': {
          statements: 40,
          branches: 40,
          functions: 30,
          lines: 40,
        },
        'packages/common/src/**': {
          statements: 30,
          branches: 30,
          functions: 25,
          lines: 30,
        },
        'packages/planner/src/**': {
          statements: 15,
          branches: 15,
          functions: 10,
          lines: 15,
        },
      },
    },
  },
});
