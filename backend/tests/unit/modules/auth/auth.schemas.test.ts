import { loginSchema } from "../../../../src/modules/auth/auth.schemas.js";

describe("loginSchema", () => {
  it("acepta un correo válido y una contraseña no vacía", () => {
    const r = loginSchema.safeParse({
      correo: "control@fhesa.mx",
      password: "fhesa123",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza un correo con formato inválido", () => {
    const r = loginSchema.safeParse({
      correo: "no-es-correo",
      password: "fhesa123",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("correo"))).toBe(true);
    }
  });

  it("rechaza una contraseña vacía", () => {
    const r = loginSchema.safeParse({
      correo: "x@y.com",
      password: "",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("password"))).toBe(true);
    }
  });

  it("rechaza entrada sin correo", () => {
    const r = loginSchema.safeParse({ password: "fhesa123" });
    expect(r.success).toBe(false);
  });

  it("rechaza entrada sin contraseña", () => {
    const r = loginSchema.safeParse({ correo: "x@y.com" });
    expect(r.success).toBe(false);
  });
});
