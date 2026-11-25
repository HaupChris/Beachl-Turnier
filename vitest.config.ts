import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*'],
    coverage: {
      provider: 'v8',
      include: ['packages/domain/src/**/*.ts'],
      reporter: ['text', 'lcov'],
      // Q43: mindestens 90 % Testabdeckung der Fachlogik.
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
