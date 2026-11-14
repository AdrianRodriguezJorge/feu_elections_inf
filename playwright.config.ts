import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas e2e en el navegador. Se ejecutan en GitHub Actions contra un servidor
 * de producción local (`next start`) y una BD de pruebas desechable.
 * Variables: APP_URL (por defecto http://localhost:3000), DATABASE_URL y
 * ALLOW_DB_RESET=true.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "test-results",
  use: {
    baseURL: process.env.APP_URL ?? "http://localhost:3000",
    locale: "es-ES",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
