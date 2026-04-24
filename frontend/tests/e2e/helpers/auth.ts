import type { Page } from "@playwright/test";

export async function loginAs(
  page: Page,
  correo: string = "control@fhesa.mx",
  password: string = "fhesa123",
): Promise<void> {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(correo);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  // La redirección al dashboard confirma login exitoso.
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
}
