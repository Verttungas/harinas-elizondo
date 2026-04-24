import request from "supertest";

import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { resetTestDb, seedDatosInspecciones } from "../helpers/db.js";
import { loginAs } from "../helpers/auth.js";

describe("Inspecciones (secuencia A-Z y ficticias)", () => {
  let tokenControl: string;
  let tokenCalidad: string;
  let loteId: bigint;
  let parametroWId: bigint;
  let parametroPId: bigint;

  beforeAll(async () => {
    await resetTestDb();
    const seed = await seedDatosInspecciones();
    loteId = seed.loteId;
    parametroWId = seed.parametroW.id;
    parametroPId = seed.parametroP.id;
    tokenControl = await loginAs(app, "control@test.mx");
    tokenCalidad = await loginAs(app, "calidad@test.mx");
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("POST /api/v1/lotes/:loteId/inspecciones", () => {
    it("201 crea la inspección A automáticamente en el primer lote", async () => {
      const res = await request(app)
        .post(`/api/v1/lotes/${loteId.toString()}/inspecciones`)
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          fechaInspeccion: "2026-04-15T10:00:00Z",
          observaciones: "Primer análisis",
          resultados: [
            { parametroId: parametroWId.toString(), valor: 275 },
            { parametroId: parametroPId.toString(), valor: 65 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.secuencia).toBe("A");
      expect(res.body.estado).toBe("CERRADA");
      expect(res.body.resultados).toHaveLength(2);
    });

    it("201 asigna B a la segunda inspección del mismo lote", async () => {
      const res = await request(app)
        .post(`/api/v1/lotes/${loteId.toString()}/inspecciones`)
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          fechaInspeccion: "2026-04-16T10:00:00Z",
          resultados: [
            { parametroId: parametroWId.toString(), valor: 280 },
            { parametroId: parametroPId.toString(), valor: 68 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.secuencia).toBe("B");
    });

    it("400 si un parámetro aparece duplicado en los resultados", async () => {
      const res = await request(app)
        .post(`/api/v1/lotes/${loteId.toString()}/inspecciones`)
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          fechaInspeccion: "2026-04-17T10:00:00Z",
          resultados: [
            { parametroId: parametroWId.toString(), valor: 270 },
            { parametroId: parametroWId.toString(), valor: 290 },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.codigo).toBe("VALIDATION_ERROR");
    });

    it("400 si un parámetro no existe", async () => {
      const res = await request(app)
        .post(`/api/v1/lotes/${loteId.toString()}/inspecciones`)
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          fechaInspeccion: "2026-04-17T10:00:00Z",
          resultados: [{ parametroId: "999999999", valor: 100 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.codigo).toBe("VALIDATION_ERROR");
    });

    it("403 para roles sin permisos (ASEGURAMIENTO_CALIDAD)", async () => {
      const res = await request(app)
        .post(`/api/v1/lotes/${loteId.toString()}/inspecciones`)
        .set("Authorization", `Bearer ${tokenCalidad}`)
        .send({
          fechaInspeccion: "2026-04-18T10:00:00Z",
          resultados: [{ parametroId: parametroWId.toString(), valor: 250 }],
        });

      expect(res.status).toBe(403);
    });

    it("404 para un loteId inexistente", async () => {
      const res = await request(app)
        .post("/api/v1/lotes/999999/inspecciones")
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          fechaInspeccion: "2026-04-18T10:00:00Z",
          resultados: [{ parametroId: parametroWId.toString(), valor: 250 }],
        });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/inspecciones/:id/ficticia", () => {
    let inspeccionAId: bigint;

    beforeAll(async () => {
      const insp = await prisma.inspeccion.findFirstOrThrow({
        where: { loteId, secuencia: "A" },
      });
      inspeccionAId = insp.id;
    });

    it("201 crea una ficticia derivada con justificación y valores distintos", async () => {
      const res = await request(app)
        .post(`/api/v1/inspecciones/${inspeccionAId.toString()}/ficticia`)
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          justificacion: "Corrección por reprocesamiento bajo condiciones controladas",
          resultados: [
            { parametroId: parametroWId.toString(), valor: 285 },
            { parametroId: parametroPId.toString(), valor: 70 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.esFicticia).toBe(true);
      expect(String(res.body.inspeccionOrigenId)).toBe(inspeccionAId.toString());
      expect(res.body.secuencia).toMatch(/^[A-Z]$/);
    });

    it("400 si los resultados de la ficticia son idénticos al origen", async () => {
      const res = await request(app)
        .post(`/api/v1/inspecciones/${inspeccionAId.toString()}/ficticia`)
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          justificacion: "Intento con mismos valores, debe fallar",
          resultados: [
            { parametroId: parametroWId.toString(), valor: 275 },
            { parametroId: parametroPId.toString(), valor: 65 },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.codigo).toBe("VALIDATION_ERROR");
      expect(res.body.error.detalles.codigo).toBe("FICTICIA_RESULTADOS_IDENTICOS");
    });

    it("400 si la justificación es demasiado corta", async () => {
      const res = await request(app)
        .post(`/api/v1/inspecciones/${inspeccionAId.toString()}/ficticia`)
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          justificacion: "corto",
          resultados: [{ parametroId: parametroWId.toString(), valor: 290 }],
        });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/v1/inspecciones/:id", () => {
    it("200 retorna inspección con lote y resultados", async () => {
      const insp = await prisma.inspeccion.findFirstOrThrow({
        where: { loteId, secuencia: "A" },
      });

      const res = await request(app)
        .get(`/api/v1/inspecciones/${insp.id.toString()}`)
        .set("Authorization", `Bearer ${tokenControl}`);

      expect(res.status).toBe(200);
      expect(res.body.secuencia).toBe("A");
      expect(res.body.lote).toBeDefined();
      expect(Array.isArray(res.body.resultados)).toBe(true);
    });
  });
});

describe("Secuencia A-Z: límite en Z (RN-22)", () => {
  let tokenControl: string;
  let loteZId: bigint;

  beforeAll(async () => {
    await resetTestDb();
    const seed = await seedDatosInspecciones();
    tokenControl = await loginAs(app, "control@test.mx");

    // Creamos 26 inspecciones (A..Z) directo en BD para evitar el costo
    // de 26 llamadas HTTP; el trigger asigna la letra automáticamente.
    for (let i = 0; i < 26; i++) {
      await prisma.inspeccion.create({
        data: {
          loteId: seed.loteId,
          secuencia: "",
          fechaInspeccion: new Date(`2026-04-${String(i + 1).padStart(2, "0")}T10:00:00Z`),
          estado: "CERRADA",
          creadoPor: seed.lab.id,
        },
      });
    }
    loteZId = seed.loteId;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rechaza con 409 al intentar crear la inspección 27 en el mismo lote", async () => {
    const anyParam = await prisma.parametro.findFirstOrThrow();

    const res = await request(app)
      .post(`/api/v1/lotes/${loteZId.toString()}/inspecciones`)
      .set("Authorization", `Bearer ${tokenControl}`)
      .send({
        fechaInspeccion: "2026-05-01T10:00:00Z",
        resultados: [{ parametroId: anyParam.id.toString(), valor: 200 }],
      });

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe("CONFLICT");
    expect(res.body.error.detalles.codigo).toBe("LOTE_SECUENCIA_AGOTADA");
  });
});
