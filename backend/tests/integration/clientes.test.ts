import request from "supertest";

import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { resetTestDb, seedDatosInspecciones } from "../helpers/db.js";
import { loginAs } from "../helpers/auth.js";

describe("Clientes (CRUD + valores de referencia)", () => {
  let tokenControl: string;
  let parametroWId: bigint;

  beforeAll(async () => {
    await resetTestDb();
    const seed = await seedDatosInspecciones();
    parametroWId = seed.parametroW.id;
    tokenControl = await loginAs(app, "control@test.mx");
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("POST /api/v1/clientes", () => {
    it("201 crea un cliente con RFC válido", async () => {
      const res = await request(app)
        .post("/api/v1/clientes")
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          claveSap: "C-TEST-01",
          nombre: "Cliente Test",
          rfc: "TST010101AB1",
          contactoCorreo: "contacto@test.mx",
          requiereCertificado: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.claveSap).toBe("C-TEST-01");
    });

    it("409 con claveSap duplicada", async () => {
      const res = await request(app)
        .post("/api/v1/clientes")
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          claveSap: "C-TEST-01",
          nombre: "Otro",
          rfc: "TST010101AB1",
          contactoCorreo: "otro@test.mx",
          requiereCertificado: true,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.codigo).toBe("CONFLICT");
      expect(res.body.error.detalles.codigo).toBe("CLIENTE_CLAVE_DUPLICADA");
    });

    it("400 con RFC inválido", async () => {
      const res = await request(app)
        .post("/api/v1/clientes")
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          claveSap: "C-BAD-RFC",
          nombre: "Cliente RFC malo",
          rfc: "1234",
          requiereCertificado: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.codigo).toBe("VALIDATION_ERROR");
    });

    it("422 si requiere certificado y no hay correo de contacto", async () => {
      const res = await request(app)
        .post("/api/v1/clientes")
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          claveSap: "C-NO-CORREO",
          nombre: "Sin correo",
          rfc: "TST010101AB2",
          requiereCertificado: true,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.codigo).toBe("UNPROCESSABLE_ENTITY");
      expect(res.body.error.detalles.codigo).toBe("CONTACTO_CORREO_REQUERIDO");
    });
  });

  describe("Valores de referencia del cliente (rangos contenidos, RN-12)", () => {
    let clienteId: bigint;

    beforeAll(async () => {
      const cli = await prisma.cliente.findFirstOrThrow({
        where: { claveSap: "C-TEST-01" },
      });
      clienteId = cli.id;
    });

    it("201 crea un valor de referencia dentro del rango internacional", async () => {
      // Parámetro W tiene rango internacional [150, 400]
      const res = await request(app)
        .post(`/api/v1/clientes/${clienteId.toString()}/valores-referencia`)
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          parametroId: parametroWId.toString(),
          limiteInferior: 200,
          limiteSuperior: 350,
        });

      expect(res.status).toBe(201);
    });

    it("422 cuando el rango del cliente se sale del rango internacional", async () => {
      const res = await request(app)
        .post(`/api/v1/clientes/${clienteId.toString()}/valores-referencia`)
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          parametroId: parametroWId.toString(),
          limiteInferior: 100,
          limiteSuperior: 450,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.codigo).toBe("UNPROCESSABLE_ENTITY");
      expect(res.body.error.detalles.codigo).toBe("VALOR_REFERENCIA_FUERA_DE_RANGO");
    });

    it("409 al duplicar valor de referencia para el mismo parámetro", async () => {
      const res = await request(app)
        .post(`/api/v1/clientes/${clienteId.toString()}/valores-referencia`)
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          parametroId: parametroWId.toString(),
          limiteInferior: 210,
          limiteSuperior: 360,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.codigo).toBe("CONFLICT");
      expect(res.body.error.detalles.codigo).toBe("VALOR_REFERENCIA_DUPLICADO");
    });
  });

  describe("Inactivación y reactivación", () => {
    let clienteId: bigint;

    beforeAll(async () => {
      const res = await request(app)
        .post("/api/v1/clientes")
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          claveSap: "C-INAC",
          nombre: "Para inactivar",
          rfc: "TST010101AB3",
          contactoCorreo: "inac@test.mx",
          requiereCertificado: true,
        });
      clienteId = BigInt(res.body.id);
    });

    it("200 inactiva un cliente activo", async () => {
      const res = await request(app)
        .post(`/api/v1/clientes/${clienteId.toString()}/inactivar`)
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({ motivo: "Cliente dejó de operar" });

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe("INACTIVO");
    });

    it("409 al inactivar un cliente ya inactivo", async () => {
      const res = await request(app)
        .post(`/api/v1/clientes/${clienteId.toString()}/inactivar`)
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({ motivo: "Duplicado" });

      expect(res.status).toBe(409);
      expect(res.body.error.codigo).toBe("CONFLICT");
      expect(res.body.error.detalles.codigo).toBe("CLIENTE_YA_INACTIVO");
    });

    it("200 reactiva un cliente inactivo", async () => {
      const res = await request(app)
        .post(`/api/v1/clientes/${clienteId.toString()}/reactivar`)
        .set("Authorization", `Bearer ${tokenControl}`);

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe("ACTIVO");
    });
  });
});
