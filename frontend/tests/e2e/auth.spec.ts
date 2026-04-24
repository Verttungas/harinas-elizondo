import { test, expect } from "@playwright/test";

test.describe("Flujo de autenticación (UC-00)", () => {
  test("login exitoso y logout completo", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);

    await page.locator('input[type="email"]').fill("control@fhesa.mx");
    await page.locator('input[type="password"]').fill("fhesa123");
    await page.locator('button[type="submit"]').click();

    // Redirige al dashboard con el nombre del usuario visible.
    await page.waitForURL(/\/dashboard/);
    await expect(page.locator("text=Carlos Méndez")).toBeVisible();

    // Abrir menú de usuario y cerrar sesión.
    await page.locator('button:has-text("Carlos Méndez")').click();
    await page.locator('text="Cerrar sesión"').click();

    // Regresar a /login.
    await page.waitForURL(/\/login/);
  });

  test("login con credenciales inválidas muestra mensaje de error", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("nadie@fhesa.mx");
    await page.locator('input[type="password"]').fill("incorrecta");
    await page.locator('button[type="submit"]').click();

    // El toast o mensaje menciona credenciales.
    await expect(page.locator("body")).toContainText(/credenciales/i, {
      timeout: 5_000,
    });
    await expect(page).toHaveURL(/\/login/);
  });

  test("intento de acceso sin sesión redirige a /login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
  });

  test("validación del formulario: correo vacío muestra error", async ({ page }) => {
    await page.goto("/login");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator("text=/requerido/i").first()).toBeVisible();
  });
});
