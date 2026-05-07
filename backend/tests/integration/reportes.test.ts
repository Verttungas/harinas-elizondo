import request from "supertest";

import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { loginAs } from "../helpers/auth.js";
import { resetTestDb, seedMinimalUsers } from "../helpers/db.js";

describe("GET /api/v1/reportes/resumen", () => {
  let tokenControl: string;
  let controlId: bigint;
  let clienteId: bigint;
  let productoId: bigint;

  beforeAll(async () => {
    await resetTestDb();
    const users = await seedMinimalUsers();
    controlId = users.control.id;
    tokenControl = await loginAs(app, "control@test.mx");

    const producto = await prisma.producto.create({
      data: { clave: "HTR-RPT", nombre: "Harina reportes" },
    });
    productoId = producto.id;

    const cliente = await prisma.cliente.create({
      data: {
        claveSap: "C-RPT-001",
        nombre: "Cliente Reportes",
        rfc: "REP010101ABC",
        contactoCorreo: "reportes@cliente.test",
        creadoPor: controlId,
        actualizadoPor: controlId,
      },
    });
    clienteId = cliente.id;

    const loteMesActual = await prisma.loteProduccion.create({
      data: {
        numeroLote: "L-RPT-001",
        productoId,
        fechaProduccion: new Date("2026-05-05T00:00:00Z"),
        cantidadProducida: 1000,
        unidadCantidad: "kg",
        creadoPor: controlId,
      },
    });

    const loteMesAnterior = await prisma.loteProduccion.create({
      data: {
        numeroLote: "L-RPT-002",
        productoId,
        fechaProduccion: new Date("2026-04-10T00:00:00Z"),
        cantidadProducida: 800,
        unidadCantidad: "kg",
        creadoPor: controlId,
      },
    });

    await prisma.inspeccion.createMany({
      data: [
        {
          loteId: loteMesActual.id,
          secuencia: "A",
          fechaInspeccion: new Date("2026-05-06T10:00:00Z"),
          estado: "CERRADA",
          creadoPor: controlId,
        },
        {
          loteId: loteMesAnterior.id,
          secuencia: "A",
          fechaInspeccion: new Date("2026-04-11T10:00:00Z"),
          estado: "CERRADA",
          creadoPor: controlId,
        },
      ],
    });

    await prisma.certificado.createMany({
      data: [
        {
          numero: "CERT-2026-100001",
          clienteId,
          loteId: loteMesActual.id,
          fechaEmision: new Date("2026-05-10T00:00:00Z"),
          creadoPor: controlId,
          cantidadEntrega: 400,
        },
        {
          numero: "CERT-2026-100002",
          clienteId,
          loteId: loteMesAnterior.id,
          fechaEmision: new Date("2026-04-20T00:00:00Z"),
          creadoPor: controlId,
          cantidadEntrega: 900,
        },
      ],
    });
  });

  it("200 retorna el shape y cálculos esperados con fecha controlada", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-20T12:00:00Z"));

    try {
      const res = await request(app)
        .get("/api/v1/reportes/resumen")
        .set("Authorization", `Bearer ${tokenControl}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        certificadosEmitidos: {
          valor: 1,
          variacionMesAnterior: 0,
        },
        saldoGlobal: {
          valor: 600,
        },
        tiempoMedioCertificacion: {
          valor: 5,
          variacionDias: -5,
        },
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
