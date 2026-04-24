import { buildTextSearch } from "../../../src/lib/filters.js";

describe("buildTextSearch", () => {
  it("retorna undefined cuando q es vacío", () => {
    expect(buildTextSearch(undefined, ["nombre"])).toBeUndefined();
    expect(buildTextSearch("", ["nombre"])).toBeUndefined();
    expect(buildTextSearch("   ", ["nombre"])).toBeUndefined();
  });

  it("retorna undefined cuando no se proveen campos", () => {
    expect(buildTextSearch("x", [])).toBeUndefined();
  });

  it("construye cláusula OR sobre todos los campos", () => {
    const r = buildTextSearch("hola", ["nombre", "clave"]);
    expect(r).toBeDefined();
    expect(r?.OR).toHaveLength(2);
    expect(r?.OR[0]).toEqual({
      nombre: { contains: "hola", mode: "insensitive" },
    });
    expect(r?.OR[1]).toEqual({
      clave: { contains: "hola", mode: "insensitive" },
    });
  });

  it("hace trim del término de búsqueda", () => {
    const r = buildTextSearch("  hola  ", ["nombre"]);
    expect(r?.OR[0]).toEqual({
      nombre: { contains: "hola", mode: "insensitive" },
    });
  });
});
