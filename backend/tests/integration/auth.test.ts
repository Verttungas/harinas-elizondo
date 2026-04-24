import request from "supertest";

import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { resetTestDb, seedMinimalUsers, TEST_PASSWORD } from "../helpers/db.js";

describe("POST /api/v1/auth/login", () => {
  beforeAll(async () => {
    await resetTestDb();
    await seedMinimalUsers();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("200 con credenciales válidas retorna token y usuario", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ correo: "control@test.mx", password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.usuario.correo).toBe("control@test.mx");
    expect(res.body.usuario.rol).toBe("CONTROL_CALIDAD");
  });

  it("401 con contraseña incorrecta", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ correo: "control@test.mx", password: "pwd-incorrecta" });

    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe("INVALID_CREDENTIALS");
  });

  it("401 con correo que no existe", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ correo: "nadie@test.mx", password: "x" });

    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe("INVALID_CREDENTIALS");
  });

  it("400 con correo mal formado", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ correo: "no-es-correo", password: "x" });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe("VALIDATION_ERROR");
  });

  it("400 con body vacío", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/v1/auth/login — bloqueo tras 5 intentos fallidos", () => {
  beforeEach(async () => {
    await resetTestDb();
    await seedMinimalUsers();
  });

  it("bloquea al usuario tras 5 intentos fallidos consecutivos", async () => {
    for (let i = 0; i < 4; i++) {
      const r = await request(app)
        .post("/api/v1/auth/login")
        .send({ correo: "control@test.mx", password: "wrong" });
      expect(r.status).toBe(401);
      expect(r.body.error.codigo).toBe("INVALID_CREDENTIALS");
    }

    // El 5° intento debe retornar ACCOUNT_LOCKED
    const quinto = await request(app)
      .post("/api/v1/auth/login")
      .send({ correo: "control@test.mx", password: "wrong" });

    expect(quinto.status).toBe(401);
    expect(quinto.body.error.codigo).toBe("ACCOUNT_LOCKED");

    // Incluso con password correcta, sigue bloqueado
    const conCorrecta = await request(app)
      .post("/api/v1/auth/login")
      .send({ correo: "control@test.mx", password: TEST_PASSWORD });

    expect(conCorrecta.status).toBe(401);
    expect(conCorrecta.body.error.codigo).toBe("ACCOUNT_LOCKED");
  });
});

describe("GET /api/v1/auth/me", () => {
  let token: string;

  beforeAll(async () => {
    await resetTestDb();
    await seedMinimalUsers();
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ correo: "lab@test.mx", password: TEST_PASSWORD });
    token = res.body.token;
  });

  it("200 con token válido retorna el usuario", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.usuario.correo).toBe("lab@test.mx");
    expect(res.body.usuario.rol).toBe("LABORATORIO");
  });

  it("401 sin token", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe("UNAUTHORIZED");
  });

  it("401 con token inválido", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer no-es-un-jwt");

    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe("UNAUTHORIZED");
  });

  it("401 con formato Authorization inválido (sin Bearer)", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", token);

    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe("UNAUTHORIZED");
  });
});

describe("POST /api/v1/auth/logout", () => {
  let token: string;

  beforeAll(async () => {
    await resetTestDb();
    await seedMinimalUsers();
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ correo: "control@test.mx", password: TEST_PASSWORD });
    token = res.body.token;
  });

  it("204 con token válido y registra en bitácora", async () => {
    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);

    const bitacora = await prisma.bitacora.findFirst({
      where: { accion: "LOGOUT" },
      orderBy: { creadoEn: "desc" },
    });
    expect(bitacora).toBeDefined();
  });

  it("401 sin token", async () => {
    const res = await request(app).post("/api/v1/auth/logout");
    expect(res.status).toBe(401);
  });
});
