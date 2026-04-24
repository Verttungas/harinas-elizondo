import {
  agregarValorReferenciaSchema,
  crearClienteSchema,
} from "../../../../src/modules/clientes/clientes.schemas.js";

describe("crearClienteSchema", () => {
  const base = {
    claveSap: "C-00001",
    nombre: "Grupo Bimbo",
    rfc: "BIM601201A12",
    requiereCertificado: true,
  };

  it("acepta un cliente válido con RFC de 12 caracteres", () => {
    const r = crearClienteSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it("acepta un cliente con RFC de persona física (13 caracteres)", () => {
    const r = crearClienteSchema.safeParse({ ...base, rfc: "PEMJ900101ABC" });
    expect(r.success).toBe(true);
  });

  it("rechaza RFC con formato inválido", () => {
    const r = crearClienteSchema.safeParse({ ...base, rfc: "1234" });
    expect(r.success).toBe(false);
  });

  it("rechaza correo de contacto con formato inválido", () => {
    const r = crearClienteSchema.safeParse({
      ...base,
      contactoCorreo: "no-es-correo",
    });
    expect(r.success).toBe(false);
  });

  it("aplica default requiereCertificado=true cuando no se provee", () => {
    const r = crearClienteSchema.safeParse({
      claveSap: "C-00002",
      nombre: "Cliente X",
      rfc: "XXX010101ABC",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.requiereCertificado).toBe(true);
    }
  });

  it("rechaza clave SAP vacía", () => {
    const r = crearClienteSchema.safeParse({ ...base, claveSap: "" });
    expect(r.success).toBe(false);
  });
});

describe("agregarValorReferenciaSchema", () => {
  it("acepta un valor de referencia válido", () => {
    const r = agregarValorReferenciaSchema.safeParse({
      parametroId: 1,
      limiteInferior: 150,
      limiteSuperior: 400,
    });
    expect(r.success).toBe(true);
  });

  it("rechaza cuando limiteSuperior <= limiteInferior", () => {
    const r = agregarValorReferenciaSchema.safeParse({
      parametroId: 1,
      limiteInferior: 400,
      limiteSuperior: 400,
    });
    expect(r.success).toBe(false);
  });

  it("coerce parametroId string a bigint", () => {
    const r = agregarValorReferenciaSchema.safeParse({
      parametroId: "123",
      limiteInferior: 10,
      limiteSuperior: 20,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.parametroId).toBe(123n);
    }
  });
});
