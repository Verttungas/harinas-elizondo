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
          direccionEnvio: "Av. Test 100, Bodega Norte, CDMX",
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
          direccionEnvio: "Av. Test 100, Bodega Norte, CDMX",
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
          direccionEnvio: "Av. Test 100, Bodega Norte, CDMX",
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
          direccionEnvio: "Av. Test 100, Bodega Norte, CDMX",
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

describe("Control de inventario por lote (saldo)", () => {
  let tokenControl: string;
  let clienteId: bigint;
  let productoId: bigint;
  let parametroWId: bigint;
  let parametroPId: bigint;
  let usuarioControlId: bigint;
  let loteChicoId: bigint;
  let inspeccionId: bigint;

  beforeAll(async () => {
    await resetTestDb();
    const seed = await seedDatosInspecciones();
    clienteId = seed.clienteBimboId;
    productoId = seed.productoId;
    parametroWId = seed.parametroW.id;
    parametroPId = seed.parametroP.id;
    tokenControl = await loginAs(app, "control@test.mx");

    const usuarioControl = await prisma.usuario.findFirstOrThrow({
      where: { correo: "control@test.mx" },
    });
    usuarioControlId = usuarioControl.id;

    const loteChico = await prisma.loteProduccion.create({
      data: {
        numeroLote: "L-SALDO-1000",
        productoId,
        fechaProduccion: new Date("2026-04-20"),
        cantidadProducida: 1000,
        unidadCantidad: "kg",
        creadoPor: usuarioControlId,
      },
    });
    loteChicoId = loteChico.id;

    const inspRes = await request(app)
      .post(`/api/v1/lotes/${loteChicoId.toString()}/inspecciones`)
      .set("Authorization", `Bearer ${tokenControl}`)
      .send({
        fechaInspeccion: "2026-04-21T10:00:00Z",
        resultados: [
          { parametroId: parametroWId.toString(), valor: 275 },
          { parametroId: parametroPId.toString(), valor: 65 },
        ],
      });
    expect(inspRes.status).toBe(201);
    inspeccionId = BigInt(inspRes.body.id);
  }, 30000);

  it("GET /api/v1/lotes/:id/saldo devuelve producida=1000 entregada=0 disponible=1000", async () => {
    const res = await request(app)
      .get(`/api/v1/lotes/${loteChicoId.toString()}/saldo`)
      .set("Authorization", `Bearer ${tokenControl}`);

    expect(res.status).toBe(200);
    expect(Number(res.body.producida)).toBe(1000);
    expect(Number(res.body.entregada)).toBe(0);
    expect(Number(res.body.disponible)).toBe(1000);
    expect(res.body.unidadCantidad).toBe("kg");
  });

  it("emite primer certificado de 500 kg sobre lote de 1000 kg (OK)", async () => {
    const res = await request(app)
      .post("/api/v1/certificados")
      .set("Authorization", `Bearer ${tokenControl}`)
      .send({
        clienteId: clienteId.toString(),
        loteId: loteChicoId.toString(),
        inspeccionIds: [inspeccionId.toString()],
        datosEmbarque: {
          numOrdenCompra: "PO-SALDO-1",
          cantidadSolicitada: 500,
          cantidadEntrega: 500,
          numFactura: "F-SALDO-1",
          direccionEnvio: "Bodega cliente, Toluca",
          fechaEnvio: "2026-04-22",
          fechaCaducidad: "2026-10-22",
        },
      });

    expect(res.status).toBe(201);
  }, 30000);

  it("rechaza segundo certificado de 600 kg con 422 LOTE_SALDO_INSUFICIENTE", async () => {
    const res = await request(app)
      .post("/api/v1/certificados")
      .set("Authorization", `Bearer ${tokenControl}`)
      .send({
        clienteId: clienteId.toString(),
        loteId: loteChicoId.toString(),
        inspeccionIds: [inspeccionId.toString()],
        datosEmbarque: {
          numOrdenCompra: "PO-SALDO-2",
          cantidadSolicitada: 600,
          cantidadEntrega: 600,
          numFactura: "F-SALDO-2",
          direccionEnvio: "Bodega cliente, Toluca",
          fechaEnvio: "2026-04-22",
          fechaCaducidad: "2026-10-22",
        },
      });

    expect(res.status).toBe(422);
    expect(res.body.error.detalles.codigo).toBe("LOTE_SALDO_INSUFICIENTE");
    expect(Number(res.body.error.detalles.disponible)).toBe(500);
    expect(Number(res.body.error.detalles.solicitada)).toBe(600);
  });

  it("GET /api/v1/lotes/:id/saldo refleja la entrega de 500 kg (disponible=500)", async () => {
    const res = await request(app)
      .get(`/api/v1/lotes/${loteChicoId.toString()}/saldo`)
      .set("Authorization", `Bearer ${tokenControl}`);

    expect(res.status).toBe(200);
    expect(Number(res.body.entregada)).toBe(500);
    expect(Number(res.body.disponible)).toBe(500);
  });
});
