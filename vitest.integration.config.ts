import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Tests de integración contra un servidor en marcha (BASE_URL) y una BD de
 * pruebas desechable. Se ejecutan en GitHub Actions; reinician la BD entre
 * ficheros, por eso exigen ALLOW_DB_RESET=true y corren en serie.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 180_000,
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
