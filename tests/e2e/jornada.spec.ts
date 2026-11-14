/**
 * Jornada electoral en el navegador: activación, apertura, voto en escritorio,
 * anulación en móvil (375 px), cierre y escrutinio sin quórum, con acceso por rol.
 * Cada paso guarda una captura en test-results/capturas.
 */

import AxeBuilder from "@axe-core/playwright";
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
  // El inicio de sesión redirige a la ruta del rol: esperar a que cargue el área autenticada.
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
}

async function capture(page: Page, name: string) {
  await page.screenshot({ path: `test-results/capturas/${name}.png`, fullPage: true });
}

/** WCAG 2.1 AA con axe: sin infracciones graves ni críticas. */
async function expectAccessible(page: Page, name: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${name}: ${v.id} (${v.nodes.length}) ${v.help}`)).toEqual([]);
}

/** Pulsa el botón de la página y confirma en el diálogo accesible. */
async function confirmAction(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name, exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

test("la electora activa su cuenta desde la interfaz y ve la espera", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
  await expectAccessible(page, "login");
  await page.getByRole("button", { name: "Primera vez: activar mi cuenta" }).click();
  await page.getByLabel("Carnet de identidad", { exact: true }).fill(BEATRIZ.ci);
  await page.getByLabel("Nueva contraseña").fill(BEATRIZ.password);
  await page.getByLabel("Repita la contraseña").fill(BEATRIZ.password);
  await page.getByRole("button", { name: "Activar cuenta" }).click();
  await expect(page.getByText(/Cuenta activada/)).toBeVisible();
  await capture(page, "01-activacion");

  await page.getByLabel("Contraseña", { exact: true }).fill(BEATRIZ.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByText("La Votación aún no ha comenzado")).toBeVisible();
  await expect(page).toHaveURL(/\/votar$/);
  await expect(page.getByRole("link", { name: "Comisión" })).toHaveCount(0);
  await expect(page.getByText(/Sufragio/)).toHaveCount(0);
  await expectAccessible(page, "espera-elector");
  await capture(page, "02-espera-elector");
});

test("la Comisión abre la votación", async ({ page }) => {
  await login(page, "Liz", AUTHORITY_PASSWORD);
  await expectAccessible(page, "panel-comision");
  await confirmAction(page, "Abrir votación");
  await expect(page.getByRole("button", { name: "Cerrar votación", exact: true })).toBeVisible();
  await capture(page, "03-votacion-abierta");
});

test("la electora vota en escritorio y verifica su comprobante", async ({ page }) => {
  await login(page, BEATRIZ.ci, BEATRIZ.password);
  await page.getByRole("checkbox", { name: /^Miembro: / }).first().check();
  await page.getByRole("radio", { name: /^Presidente: / }).first().check();
  await expectAccessible(page, "boleta");
  await capture(page, "04-boleta-marcada");
  await page.getByRole("button", { name: "Revisar y votar" }).click();
  const review = page.getByRole("dialog", { name: "Revise su voto" });
  await expect(review).toBeVisible();
  await capture(page, "05a-revision");
  await review.getByRole("button", { name: "Confirmar voto" }).click();
  await expect(page.getByText("Voto registrado")).toBeVisible();
  await capture(page, "05-voto-registrado");

  await page.getByRole("button", { name: "Verificar comprobante" }).click();
  await expect(page.getByText("Su boleta está en la urna y se contará en el escrutinio.")).toBeVisible();
  await capture(page, "06-comprobante-verificado");
});

test("otro elector anula su boleta en móvil (375 px) sin scroll horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page, CARLOS.ci, CARLOS.password);
  await expect(page.getByRole("button", { name: "Anular mi boleta" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await capture(page, "07-boleta-movil");

  await page.getByRole("button", { name: "Anular mi boleta" }).click();
  await page.getByRole("button", { name: "Sí, anular boleta" }).click();
  await expect(page.getByText("Boleta anulada registrada")).toBeVisible();
  await capture(page, "08-anulada-movil");
});

test("la Comisión cierra y escruta: sin quórum no se proclama", async ({ page }) => {
  await login(page, "Liz", AUTHORITY_PASSWORD);
  await confirmAction(page, "Cerrar votación");
  await expect(page.getByRole("button", { name: "Abrir votación", exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: "Resultados" }).click();
  await expect(page).toHaveURL(/\/resultados$/);
  await confirmAction(page, "Realizar escrutinio");
  await expect(page.getByText("La elección no es válida por falta de quórum (Art. 38)")).toBeVisible();
  await expect(page.getByText(/Presidente electo de la Facultad/)).toHaveCount(0);
  await expect(page.getByText("Acta de escrutinio y proclamación")).toHaveCount(0);
  await expectAccessible(page, "sin-quorum");
  await capture(page, "09-sin-quorum");
});

test("cada rol solo entra en sus rutas", async ({ page }) => {
  await login(page, BEATRIZ.ci, BEATRIZ.password);
  await expect(page).toHaveURL(/\/votar$/);
  await page.goto("/comision");
  await expect(page).toHaveURL(/\/votar$/);
  await page.goto("/observacion");
  await expect(page).toHaveURL(/\/votar$/);
});

test("páginas públicas sin sesión: verificar y reglamento", async ({ page }) => {
  await page.goto("/votar");
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("link", { name: "Verificar un comprobante" }).click();
  await expect(page).toHaveURL(/\/verificar$/);
  await expectAccessible(page, "verificar");
  await page.goto("/reglamento");
  await expect(page.getByRole("searchbox").or(page.getByRole("textbox")).first()).toBeVisible();
  await expectAccessible(page, "reglamento");
});

test("capturas de cada pantalla en escritorio y móvil", async ({ page }) => {
  await login(page, "Liz", AUTHORITY_PASSWORD);
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    for (const path of ["/comision", "/resultados", "/observacion", "/reglamento"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} a ${width}px`).toBeLessThanOrEqual(0);
      await capture(page, `pantalla-${path.slice(1)}-${width}`);
    }
  }
});
