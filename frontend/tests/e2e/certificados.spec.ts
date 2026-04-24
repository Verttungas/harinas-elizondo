import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Emisión de certificado end-to-end (UC-12)", () => {
  test("lista de certificados es accesible", async ({ page }) => {
    await loginAs(page);
    await page.goto("/certificados");
    await expect(page.locator("body")).toContainText(/certificados/i);
  });

  test(
    "emite un certificado para Bimbo / L-2026-001 y verifica correo en MailHog",
    async ({ page, request }) => {
      await loginAs(page);

      // Limpiar bandeja de MailHog antes del test.
      await request.delete("http://localhost:8025/api/v1/messages").catch(() => {
        // ignorar si la bandeja ya estaba vacía
      });

      await page.goto("/certificados/nuevo");

      // Paso 1: seleccionar cliente Bimbo.
      await page.getByText(/Bimbo/i).first().click();
      await page
        .locator('button:has-text("Siguiente"), button:has-text("Continuar")')
        .first()
        .click();

      // Paso 2: seleccionar el lote L-2026-001 y una inspección cerrada.
      await page.locator("text=L-2026-001").first().click();
      // Seleccionar la primera inspección disponible (checkbox).
      await page.locator('input[type="checkbox"]').first().check();
      await page
        .locator('button:has-text("Siguiente"), button:has-text("Continuar")')
        .first()
        .click();

      // Paso 3: datos de embarque.
      await page
        .locator('input[name="numOrdenCompra"]')
        .fill(`PO-E2E-${Date.now().toString().slice(-4)}`);
      await page.locator('input[name="cantidadSolicitada"]').fill("1000");
      await page.locator('input[name="cantidadEntrega"]').fill("1000");
      await page
        .locator('input[name="numFactura"]')
        .fill(`F-E2E-${Date.now().toString().slice(-4)}`);
      await page.locator('input[name="fechaEnvio"]').fill("2026-04-25");
      await page.locator('input[name="fechaCaducidad"]').fill("2026-10-25");
      await page
        .locator('button:has-text("Siguiente"), button:has-text("Continuar")')
        .first()
        .click();

      // Paso 4: revisar y emitir.
      await page
        .locator('button:has-text("Emitir")')
        .first()
        .click();

      // El número de certificado aparece en la UI.
      await expect(page.locator("text=/CERT-2026-\\d{6}/")).toBeVisible({
        timeout: 15_000,
      });

      // Verificar que MailHog recibió al menos un correo con "Certificado".
      // Damos tiempo al envío async.
      await page.waitForTimeout(3_000);
      const res = await request.get("http://localhost:8025/api/v2/messages");
      const data: { items: Array<{ Content: { Headers: { Subject: string[] } } }> } =
        await res.json();
      const asuntos = data.items.map((m) => m.Content.Headers.Subject[0]);
      expect(asuntos.some((s) => /Certificado/i.test(s ?? ""))).toBe(true);
    },
  );
});
