/**
 * Jornada electoral en el navegador: activación, apertura, voto en escritorio,
 * anulación en móvil (375 px), cierre y escrutinio sin quórum, con acceso por rol.
 * Cada paso guarda una captura en test-results/capturas.
 */

import { expect, Page, test } from "@playwright/test";
import { activate, AUTHORITIES, AUTHORITY_PASSWORD, resetDb } from "../integration/helpers";

const BEATRIZ = { ci: "98052122334", password: "Beatriz2026x" };
const CARLOS = { ci: "98021411223", password: "Carlos2026x" };

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetDb();
  // Activaciones por API antes de abrir (el plazo se cierra al abrir la votación).
  await activate(AUTHORITIES.Liz, AUTHORITY_PASSWORD);
  await activate(CARLOS.ci, CARLOS.password);
});

async function login(page: Page, identifier: string, password: string) {
  await page.goto("/");
  await page.getByLabel("Carnet de identidad o nombre completo").fill(identifier);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}

async function capture(page: Page, name: string) {
  await page.screenshot({ path: `test-results/capturas/${name}.png`, fullPage: true });
}

test("la electora activa su cuenta desde la interfaz y ve la espera", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Primera vez: activar mi cuenta" }).click();
  await page.getByLabel("Carnet de identidad", { exact: true }).fill(BEATRIZ.ci);
  await page.getByLabel("Nueva contraseña").fill(BEATRIZ.password);
  await page.getByLabel("Repite la contraseña").fill(BEATRIZ.password);
  await page.getByRole("button", { name: "Activar cuenta" }).click();
  await expect(page.getByText(/Cuenta activada/)).toBeVisible();
  await capture(page, "01-activacion");

  await page.getByLabel("Contraseña", { exact: true }).fill(BEATRIZ.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByText("La Votación aún no ha comenzado")).toBeVisible();
  await expect(page.getByRole("button", { name: "Administración" })).toHaveCount(0);
  await capture(page, "02-espera-elector");
});

test("la Comisión abre la votación", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  await login(page, "Liz", AUTHORITY_PASSWORD);
  await page.getByRole("button", { name: "Abrir Votación" }).click();
  await expect(page.getByRole("button", { name: "Cerrar Votación y Sellar Urnas" })).toBeVisible();
  await capture(page, "03-votacion-abierta");
});

test("la electora vota en escritorio y verifica su comprobante", async ({ page }) => {
  await login(page, BEATRIZ.ci, BEATRIZ.password);
  const firstRow = page.locator("table tbody tr").first();
  await firstRow.locator('input[type="checkbox"]').check();
  await firstRow.locator('input[type="radio"]').check();
  await capture(page, "04-boleta-marcada");
  await page.getByRole("button", { name: "Depositar Voto Válido en la Urna" }).click();
  await expect(page.getByText("Voto registrado")).toBeVisible();
  await capture(page, "05-voto-registrado");

  await page.getByRole("button", { name: "Verificar comprobante" }).click();
  await expect(page.getByText("Tu boleta está en la urna y se contará en el escrutinio.")).toBeVisible();
  await capture(page, "06-comprobante-verificado");
});

test("otro elector anula su boleta en móvil (375 px) sin scroll horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page, CARLOS.ci, CARLOS.password);
  await expect(page.getByRole("button", { name: "Anular boleta conscientemente" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await capture(page, "07-boleta-movil");

  await page.getByRole("button", { name: "Anular boleta conscientemente" }).click();
  await page.getByRole("button", { name: "Sí, anular boleta" }).click();
  await expect(page.getByText("Boleta anulada registrada")).toBeVisible();
  await capture(page, "08-anulada-movil");
});

test("la Comisión cierra y escruta: sin quórum no se proclama", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  await login(page, "Liz", AUTHORITY_PASSWORD);
  await page.getByRole("button", { name: "Cerrar Votación y Sellar Urnas" }).click();
  await expect(page.getByRole("button", { name: "Abrir Votación" })).toHaveCount(0);

  await page.getByRole("button", { name: "Escrutinio" }).click();
  await page.getByRole("button", { name: "Realizar Escrutinio Oficial" }).click();
  await expect(page.getByText("Elección no Válida (Art. 38 del ABC)")).toBeVisible();
  await expect(page.getByText("Presidente Electo de la Facultad")).toHaveCount(0);
  await expect(page.getByText("Acta Oficial de Escrutinio y Proclamación")).toHaveCount(0);
  await capture(page, "09-sin-quorum");
});
