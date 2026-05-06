import { crearInspeccionSchema } from "../../../../src/modules/inspecciones/inspecciones.schemas.js";

describe("crearInspeccionSchema", () => {
  const base = {
    fechaInspeccion: "2026-04-15T10:00:00Z",
    resultados: [{ parametroId: 1, valor: 275 }],
  };

  it("acepta una inspección válida", () => {
    const r = crearInspeccionSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.guardarComoBorrador).toBe(false);
    }
  });

  it("rechaza fecha inválida", () => {
    const r = crearInspeccionSchema.safeParse({
      ...base,
      fechaInspeccion: "no-es-fecha",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza inspección sin resultados", () => {
    const r = crearInspeccionSchema.safeParse({ ...base, resultados: [] });
    expect(r.success).toBe(false);
  });

  it("acepta guardarComoBorrador = true", () => {
    const r = crearInspeccionSchema.safeParse({
      ...base,
      guardarComoBorrador: true,
    });
    expect(r.success).toBe(true);
  });
});
