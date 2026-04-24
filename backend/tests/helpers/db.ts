import bcrypt from "bcrypt";
import { PrismaClient, RolUsuario } from "@prisma/client";
import { prisma } from "../../src/lib/prisma.js";

export const TEST_PASSWORD = "fhesa123";

// Orden de borrado respetando llaves foráneas. Borramos datos, no el esquema,
// para que los tests de integración puedan partir de un estado limpio sin
// ejecutar migraciones entre cada archivo.
const DELETE_ORDER = [
  "bitacora",
  "envioCertificado",
  "certificadoInspeccion",
  "certificado",
  "resultadoInspeccion",
  "inspeccion",
  "loteProduccion",
  "valorReferenciaCliente",
  "cliente",
  "parametro",
  "equipoLaboratorio",
  "producto",
  "usuario",
] as const;

export async function resetTestDb(
  db: PrismaClient = prisma,
): Promise<void> {
  // Truncate con CASCADE sería más rápido; usamos Prisma deleteMany para no
  // depender del nombre del esquema aquí.
  for (const model of DELETE_ORDER) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)[model].deleteMany({});
  }
}

export interface SeededUser {
  id: bigint;
  correo: string;
  nombre: string;
  rol: RolUsuario;
}

export interface SeedResult {
  control: SeededUser;
  lab: SeededUser;
  calidad: SeededUser;
  gerente: SeededUser;
  director: SeededUser;
}

// Cacheamos el hash para todos los seeds de la suite: bcrypt cost=10 es lento
// (~100ms). Una sola vez por proceso es suficiente.
let cachedHash: string | undefined;
async function hashOnce(): Promise<string> {
  if (cachedHash) return cachedHash;
  cachedHash = await bcrypt.hash(TEST_PASSWORD, 10);
  return cachedHash;
}

export async function seedMinimalUsers(
  db: PrismaClient = prisma,
): Promise<SeedResult> {
  const passwordHash = await hashOnce();

  const [control, lab, calidad, gerente, director] = await Promise.all([
    db.usuario.create({
      data: {
        correo: "control@test.mx",
        passwordHash,
        nombre: "Carlos Control",
        rol: RolUsuario.CONTROL_CALIDAD,
      },
    }),
    db.usuario.create({
      data: {
        correo: "lab@test.mx",
        passwordHash,
        nombre: "Ana Lab",
        rol: RolUsuario.LABORATORIO,
      },
    }),
    db.usuario.create({
      data: {
        correo: "calidad@test.mx",
        passwordHash,
        nombre: "Diana Calidad",
        rol: RolUsuario.ASEGURAMIENTO_CALIDAD,
      },
    }),
    db.usuario.create({
      data: {
        correo: "gerente@test.mx",
        passwordHash,
        nombre: "Eduardo Gerente",
        rol: RolUsuario.GERENTE_PLANTA,
      },
    }),
    db.usuario.create({
      data: {
        correo: "director@test.mx",
        passwordHash,
        nombre: "Fernanda Directora",
        rol: RolUsuario.DIRECTOR_OPERACIONES,
      },
    }),
  ]);

  return {
    control: { id: control.id, correo: control.correo, nombre: control.nombre, rol: control.rol },
    lab: { id: lab.id, correo: lab.correo, nombre: lab.nombre, rol: lab.rol },
    calidad: { id: calidad.id, correo: calidad.correo, nombre: calidad.nombre, rol: calidad.rol },
    gerente: { id: gerente.id, correo: gerente.correo, nombre: gerente.nombre, rol: gerente.rol },
    director: { id: director.id, correo: director.correo, nombre: director.nombre, rol: director.rol },
  };
}

export interface SeedInspeccionesResult extends SeedResult {
  equipoId: bigint;
  parametroW: { id: bigint; clave: string };
  parametroP: { id: bigint; clave: string };
  clienteBimboId: bigint;
  productoId: bigint;
  loteId: bigint;
}

export async function seedDatosInspecciones(
  db: PrismaClient = prisma,
): Promise<SeedInspeccionesResult> {
  const users = await seedMinimalUsers(db);

  const producto = await db.producto.create({
    data: { clave: "HTR-000", nombre: "Harina de trigo 000" },
  });

  const equipo = await db.equipoLaboratorio.create({
    data: {
      clave: "ALV-001",
      descripcionCorta: "Alveógrafo Chopin",
      creadoPor: users.control.id,
      actualizadoPor: users.control.id,
      parametros: {
        create: [
          {
            clave: "W",
            nombre: "Fuerza panadera",
            unidadMedida: "x10⁻⁴ J",
            limiteInferior: 150,
            limiteSuperior: 400,
            desviacionAceptable: 5,
          },
          {
            clave: "P",
            nombre: "Tenacidad",
            unidadMedida: "mm H2O",
            limiteInferior: 40,
            limiteSuperior: 100,
            desviacionAceptable: 2,
          },
        ],
      },
    },
    include: { parametros: true },
  });

  const paramW = equipo.parametros.find((p) => p.clave === "W");
  const paramP = equipo.parametros.find((p) => p.clave === "P");
  if (!paramW || !paramP) throw new Error("Seed: parametros no creados");

  const cliente = await db.cliente.create({
    data: {
      claveSap: "C-BIMBO",
      nombre: "Grupo Bimbo",
      rfc: "BIM601201A12",
      contactoNombre: "Ing. Contacto",
      contactoCorreo: "contacto@bimbo.fhesa.test",
      requiereCertificado: true,
      creadoPor: users.control.id,
      actualizadoPor: users.control.id,
      valoresReferencia: {
        create: [
          {
            parametroId: paramW.id,
            limiteInferior: 180,
            limiteSuperior: 380,
          },
        ],
      },
    },
  });

  const lote = await db.loteProduccion.create({
    data: {
      numeroLote: "L-TEST-001",
      productoId: producto.id,
      fechaProduccion: new Date("2026-04-15"),
      cantidadProducida: 5000,
      unidadCantidad: "kg",
      creadoPor: users.control.id,
    },
  });

  return {
    ...users,
    equipoId: equipo.id,
    parametroW: { id: paramW.id, clave: paramW.clave },
    parametroP: { id: paramP.id, clave: paramP.clave },
    clienteBimboId: cliente.id,
    productoId: producto.id,
    loteId: lote.id,
  };
}
