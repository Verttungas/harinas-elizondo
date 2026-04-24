import request from "supertest";

import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { resetTestDb, seedMinimalUsers } from "../helpers/db.js";
import { loginAs } from "../helpers/auth.js";

describe("Equipos de laboratorio (CRUD)", () => {
  let tokenControl: string;
  let tokenLab: string;

  beforeAll(async () => {
    await resetTestDb();
    await seedMinimalUsers();
    tokenControl = await loginAs(app, "control@test.mx");
    tokenLab = await loginAs(app, "lab@test.mx");
  });

  describe("POST /api/v1/equipos", () => {
    it("201 crea un equipo con parámetros (CONTROL_CALIDAD)", async () => {
      const res = await request(app)
        .post("/api/v1/equipos")
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          clave: "ALV-TEST",
          descripcionCorta: "Alveógrafo de prueba",
          marca: "Chopin",
          parametros: [
            {
              clave: "W",
              nombre: "Fuerza panadera",
              unidadMedida: "x10⁻⁴ J",
              limiteInferior: 150,
              limiteSuperior: 400,
              desviacionAceptable: 5,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.clave).toBe("ALV-TEST");
      expect(res.body.parametros).toHaveLength(1);
      expect(res.body.parametros[0].clave).toBe("W");
    });

    it("403 para roles distintos de CONTROL_CALIDAD", async () => {
      const res = await request(app)
        .post("/api/v1/equipos")
        .set("Authorization", `Bearer ${tokenLab}`)
        .send({
          clave: "ALV-LAB",
          descripcionCorta: "Equipo lab",
          parametros: [
            {
              clave: "X",
              nombre: "Prueba",
              unidadMedida: "u",
              limiteInferior: 1,
              limiteSuperior: 10,
            },
          ],
        });

      expect(res.status).toBe(403);
      expect(res.body.error.codigo).toBe("FORBIDDEN");
    });

    it("409 con clave duplicada", async () => {
      const res = await request(app)
        .post("/api/v1/equipos")
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          clave: "ALV-TEST",
          descripcionCorta: "Duplicado",
          parametros: [
            {
              clave: "X",
              nombre: "X",
              unidadMedida: "u",
              limiteInferior: 1,
              limiteSuperior: 10,
            },
          ],
        });

      expect(res.status).toBe(409);
      expect(res.body.error.codigo).toBe("CONFLICT");
      expect(res.body.error.detalles.codigo).toBe("EQUIPO_CLAVE_DUPLICADA");
    });

    it("400 con parámetro cuyo limiteSuperior <= limiteInferior", async () => {
      const res = await request(app)
        .post("/api/v1/equipos")
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          clave: "ALV-BAD",
          descripcionCorta: "Malo",
          parametros: [
            {
              clave: "X",
              nombre: "X",
              unidadMedida: "u",
              limiteInferior: 100,
              limiteSuperior: 100,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.codigo).toBe("VALIDATION_ERROR");
    });

    it("400 sin parámetros", async () => {
      const res = await request(app)
        .post("/api/v1/equipos")
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          clave: "ALV-NOPARM",
          descripcionCorta: "Sin parámetros",
          parametros: [],
        });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/v1/equipos", () => {
    it("200 lista equipos paginados", async () => {
      const res = await request(app)
        .get("/api/v1/equipos")
        .set("Authorization", `Bearer ${tokenControl}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
    });

    it("401 sin autenticación", async () => {
      const res = await request(app).get("/api/v1/equipos");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/equipos/:id", () => {
    it("200 retorna el equipo con sus parámetros activos", async () => {
      const equipo = await prisma.equipoLaboratorio.findFirstOrThrow({
        where: { clave: "ALV-TEST" },
      });

      const res = await request(app)
        .get(`/api/v1/equipos/${equipo.id.toString()}`)
        .set("Authorization", `Bearer ${tokenControl}`);

      expect(res.status).toBe(200);
      expect(res.body.clave).toBe("ALV-TEST");
      expect(res.body.parametros).toBeDefined();
    });

    it("404 para un id inexistente", async () => {
      const res = await request(app)
        .get("/api/v1/equipos/99999999")
        .set("Authorization", `Bearer ${tokenControl}`);

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/equipos/:id/parametros", () => {
    it("201 agrega un parámetro al equipo", async () => {
      const equipo = await prisma.equipoLaboratorio.findFirstOrThrow({
        where: { clave: "ALV-TEST" },
      });

      const res = await request(app)
        .post(`/api/v1/equipos/${equipo.id.toString()}/parametros`)
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          clave: "P",
          nombre: "Tenacidad",
          unidadMedida: "mm H2O",
          limiteInferior: 40,
          limiteSuperior: 100,
        });

      expect(res.status).toBe(201);
      expect(res.body.clave).toBe("P");
    });

    it("409 con clave de parámetro duplicada en el mismo equipo", async () => {
      const equipo = await prisma.equipoLaboratorio.findFirstOrThrow({
        where: { clave: "ALV-TEST" },
      });

      const res = await request(app)
        .post(`/api/v1/equipos/${equipo.id.toString()}/parametros`)
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          clave: "W",
          nombre: "Duplicado",
          unidadMedida: "u",
          limiteInferior: 1,
          limiteSuperior: 10,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.codigo).toBe("CONFLICT");
      expect(res.body.error.detalles.codigo).toBe("PARAMETRO_CLAVE_DUPLICADA");
    });
  });

  describe("POST /api/v1/equipos/:id/inactivar", () => {
    it("200 inactiva un equipo activo", async () => {
      const creado = await request(app)
        .post("/api/v1/equipos")
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({
          clave: "EQ-INAC",
          descripcionCorta: "Para inactivar",
          parametros: [
            {
              clave: "X",
              nombre: "X",
              unidadMedida: "u",
              limiteInferior: 1,
              limiteSuperior: 10,
            },
          ],
        });
      expect(creado.status).toBe(201);

      const res = await request(app)
        .post(`/api/v1/equipos/${creado.body.id}/inactivar`)
        .set("Authorization", `Bearer ${tokenControl}`)
        .send({ motivo: "Mantenimiento programado" });

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe("INACTIVO");
    });
  });
});
