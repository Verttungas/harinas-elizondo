import {
  crearFicticiaSchema,
  crearInspeccionSchema,
} from "../../../../src/modules/inspecciones/inspecciones.schemas.js";

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

describe("crearFicticiaSchema", () => {
  const base = {
    justificacion: "Ajuste por error de lectura en el equipo",
    resultados: [{ parametroId: 1, valor: 280 }],
  };

  it("acepta una ficticia con justificación ≥ 10 caracteres", () => {
    const r = crearFicticiaSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it("rechaza justificación corta (< 10 caracteres)", () => {
    const r = crearFicticiaSchema.safeParse({
      ...base,
      justificacion: "corto",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza ficticia sin resultados", () => {
    const r = crearFicticiaSchema.safeParse({ ...base, resultados: [] });
    expect(r.success).toBe(false);
  });

  it("rechaza justificación > 1000 caracteres", () => {
    const r = crearFicticiaSchema.safeParse({
      ...base,
      justificacion: "x".repeat(1001),
    });
    expect(r.success).toBe(false);
  });
});
