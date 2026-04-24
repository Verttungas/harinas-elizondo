import request from "supertest";
import { promises as fs } from "node:fs";

import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { resetTestDb, seedDatosInspecciones } from "../helpers/db.js";
import { loginAs } from "../helpers/auth.js";

describe("POST /api/v1/certificados (emisión)", () => {
  let tokenControl: string;
  let tokenLab: string;
  let clienteId: bigint;
  let loteId: bigint;
  let inspeccionId: bigint;

  beforeAll(async () => {
    await resetTestDb();
    const seed = await seedDatosInspecciones();
    clienteId = seed.clienteBimboId;
    loteId = seed.loteId;
    tokenControl = await loginAs(app, "control@test.mx");
    tokenLab = await loginAs(app, "lab@test.mx");

    // Creamos una inspección cerrada en el lote vía API (para que el trigger
    // asigne la letra y la bitácora quede consistente).
    const inspRes = await request(app)
      .post(`/api/v1/lotes/${loteId.toString()}/inspecciones`)
      .set("Authorization", `Bearer ${tokenControl}`)
      .send({
        fechaInspeccion: "2026-04-18T10:00:00Z",
        resultados: [
          { parametroId: seed.parametroW.id.toString(), valor: 275 },
          { parametroId: seed.parametroP.id.toString(), valor: 65 },
        ],
      });
    expect(inspRes.status).toBe(201);
    inspeccionId = BigInt(inspRes.body.id);
  }, 30000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("201 emite un certificado y genera PDF", async () => {
    const res = await request(app)
      .post("/api/v1/certificados")
      .set("Authorization", `Bearer ${tokenControl}`)
      .send({
        clienteId: clienteId.toString(),
        loteId: loteId.toString(),
        inspeccionIds: [inspeccionId.toString()],
        datosEmbarque: {
          numOrdenCompra: "PO-TEST-001",
          cantidadSolicitada: 1000,
          cantidadEntrega: 1000,
          numFactura: "F-TEST-001",
          fechaEnvio: "2026-04-20",
          fechaCaducidad: "2026-10-20",
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.numero).toMatch(/^CERT-\d{4}-\d{6}$/);

    // El PDF debe existir físicamente.
    const cert = await prisma.certificado.findUniqueOrThrow({
      where: { id: BigInt(res.body.id) },
    });
    expect(cert.rutaPdf).toBeTruthy();
    await expect(fs.access(cert.rutaPdf!)).resolves.toBeUndefined();

    // Deben crearse 2 envíos (cliente + almacén).
    const envios = await prisma.envioCertificado.findMany({
      where: { certificadoId: cert.id },
    });
    expect(envios).toHaveLength(2);
  }, 30000);

  it("403 si el rol no es CONTROL_CALIDAD", async () => {
    const res = await request(app)
      .post("/api/v1/certificados")
      .set("Authorization", `Bearer ${tokenLab}`)
      .send({
        clienteId: clienteId.toString(),
        loteId: loteId.toString(),
        inspeccionIds: [inspeccionId.toString()],
        datosEmbarque: {
          numOrdenCompra: "PO-TEST-002",
          cantidadSolicitada: 500,
          cantidadEntrega: 500,
          numFactura: "F-TEST-002",
          fechaEnvio: "2026-04-20",
          fechaCaducidad: "2026-10-20",
        },
      });
    expect(res.status).toBe(403);
  });

  it("400 si cantidadEntrega > cantidadSolicitada", async () => {
    const res = await request(app)
      .post("/api/v1/certificados")
      .set("Authorization", `Bearer ${tokenControl}`)
      .send({
        clienteId: clienteId.toString(),
        loteId: loteId.toString(),
        inspeccionIds: [inspeccionId.toString()],
        datosEmbarque: {
          numOrdenCompra: "PO-BAD",
          cantidadSolicitada: 100,
          cantidadEntrega: 200,
          numFactura: "F-BAD",
          fechaEnvio: "2026-04-20",
          fechaCaducidad: "2026-10-20",
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe("VALIDATION_ERROR");
  });

  it("422 si la inspección no pertenece al lote", async () => {
    // Crear otro lote e inspección
    const otroLote = await prisma.loteProduccion.create({
      data: {
        numeroLote: "L-OTRO",
        productoId: (
          await prisma.producto.findFirstOrThrow()
        ).id,
        fechaProduccion: new Date("2026-04-19"),
        cantidadProducida: 1000,
        unidadCantidad: "kg",
        creadoPor: (
          await prisma.usuario.findFirstOrThrow({ where: { correo: "control@test.mx" } })
        ).id,
      },
    });

    const res = await request(app)
      .post("/api/v1/certificados")
      .set("Authorization", `Bearer ${tokenControl}`)
      .send({
        clienteId: clienteId.toString(),
        loteId: otroLote.id.toString(),
        inspeccionIds: [inspeccionId.toString()],
        datosEmbarque: {
          numOrdenCompra: "PO-OTROLOTE",
          cantidadSolicitada: 100,
          cantidadEntrega: 100,
          numFactura: "F-OTRO",
          fechaEnvio: "2026-04-20",
          fechaCaducidad: "2026-10-20",
        },
      });

    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe("UNPROCESSABLE_ENTITY");
    expect(res.body.error.detalles.codigo).toBe("INSPECCION_LOTE_INVALIDO");
  });

  it("GET /api/v1/certificados lista certificados emitidos", async () => {
    const res = await request(app)
      .get("/api/v1/certificados")
      .set("Authorization", `Bearer ${tokenControl}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].numero).toMatch(/^CERT-/);
  });

  it("GET /api/v1/certificados/:id/pdf descarga el PDF", async () => {
    const cert = await prisma.certificado.findFirstOrThrow({
      where: { rutaPdf: { not: null } },
    });

    const res = await request(app)
      .get(`/api/v1/certificados/${cert.id.toString()}/pdf`)
      .set("Authorization", `Bearer ${tokenControl}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
  });
});
