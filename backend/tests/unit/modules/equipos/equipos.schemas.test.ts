import {
  crearEquipoSchema,
  crearParametroSchema,
  listEquiposQuerySchema,
} from "../../../../src/modules/equipos/equipos.schemas.js";

describe("crearParametroSchema", () => {
  const base = {
    clave: "W",
    nombre: "Fuerza panadera",
    unidadMedida: "x10⁻⁴ J",
    limiteInferior: 150,
    limiteSuperior: 400,
  };

  it("acepta un parámetro válido", () => {
    const r = crearParametroSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it("rechaza un parámetro con limiteSuperior <= limiteInferior", () => {
    const r = crearParametroSchema.safeParse({
      ...base,
      limiteInferior: 400,
      limiteSuperior: 400,
    });
    expect(r.success).toBe(false);
  });

  it("rechaza un parámetro con clave vacía", () => {
    const r = crearParametroSchema.safeParse({ ...base, clave: "" });
    expect(r.success).toBe(false);
  });

  it("rechaza desviacionAceptable negativa", () => {
    const r = crearParametroSchema.safeParse({
      ...base,
      desviacionAceptable: -1,
    });
    expect(r.success).toBe(false);
  });
});

describe("crearEquipoSchema", () => {
  const base = {
    clave: "ALV-001",
    descripcionCorta: "Alveógrafo Chopin",
    parametros: [
      {
        clave: "W",
        nombre: "Fuerza panadera",
        unidadMedida: "x10⁻⁴ J",
        limiteInferior: 150,
        limiteSuperior: 400,
      },
    ],
  };

  it("acepta un equipo con al menos un parámetro", () => {
    const r = crearEquipoSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it("rechaza un equipo sin parámetros", () => {
    const r = crearEquipoSchema.safeParse({ ...base, parametros: [] });
    expect(r.success).toBe(false);
  });

  it("rechaza un equipo sin clave", () => {
    const r = crearEquipoSchema.safeParse({ ...base, clave: "" });
    expect(r.success).toBe(false);
  });

  it("acepta fechas ISO en fechaAdquisicion", () => {
    const r = crearEquipoSchema.safeParse({
      ...base,
      fechaAdquisicion: "2025-01-15",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza fechas inválidas", () => {
    const r = crearEquipoSchema.safeParse({
      ...base,
      fechaAdquisicion: "no-es-fecha",
    });
    expect(r.success).toBe(false);
  });
});

describe("listEquiposQuerySchema", () => {
  it("aplica defaults para page, limit y estado", () => {
    const r = listEquiposQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(1);
      expect(r.data.limit).toBe(20);
      expect(r.data.estado).toBe("ACTIVO");
    }
  });

  it("acepta estado TODOS", () => {
    const r = listEquiposQuerySchema.safeParse({ estado: "TODOS" });
    expect(r.success).toBe(true);
  });

  it("rechaza un estado desconocido", () => {
    const r = listEquiposQuerySchema.safeParse({ estado: "ROTO" });
    expect(r.success).toBe(false);
  });
});
