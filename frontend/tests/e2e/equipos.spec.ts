import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Equipos de laboratorio (UC-01)", () => {
  test("lista equipos del seed", async ({ page }) => {
    await loginAs(page);
    await page.goto("/equipos");
    await expect(page.locator("text=/ALV-001|FAR-001/")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("crea un equipo nuevo con un parámetro", async ({ page }) => {
    await loginAs(page);
    await page.goto("/equipos");

    // Abrir formulario de nuevo equipo.
    await page
      .locator('a[href="/equipos/nuevo"], button:has-text("Nuevo")')
      .first()
      .click();
    await page.waitForURL(/\/equipos\/nuevo/);

    // Clave única derivada del timestamp para evitar colisiones entre corridas.
    const clave = `ALV-E2E-${Date.now().toString().slice(-4)}`;
    await page.locator('input[name="clave"]').fill(clave);
    await page
      .locator('input[name="descripcionCorta"]')
      .fill("Alveógrafo E2E");

    // Abrir el diálogo de parámetro.
    await page.locator('button:has-text("Agregar parámetro")').click();

    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('input[name="clave"]').fill("WE2E");
    await dialog
      .locator('input[name="nombre"]')
      .fill("Parámetro E2E");
    await dialog
      .locator('input[name="unidadMedida"]')
      .fill("u");
    await dialog
      .locator('input[name="limiteInferior"]')
      .fill("10");
    await dialog
      .locator('input[name="limiteSuperior"]')
      .fill("100");
    await dialog.locator('button[type="submit"]').click();

    // Guardar el equipo.
    await page.locator('button:has-text("Crear")').click();

    // Tras guardar, volvemos al listado y aparece el nuevo equipo.
    await page.waitForURL(/\/equipos$/);
    await expect(page.locator(`text=${clave}`)).toBeVisible({
      timeout: 10_000,
    });
  });
});
