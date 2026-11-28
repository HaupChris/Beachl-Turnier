import { defineConfig, devices } from '@playwright/test';

/** End-to-End-Tests der Hauptabläufe (architecture.md „Teststrategie“). */
export default defineConfig({
  testDir: 'e2e',
  outputDir: '.local/e2e-results',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5174',
    locale: 'de-DE',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } },
    },
  ],
  webServer: {
    command: 'npm run dev -w @beachl/web -- --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
  },
});
