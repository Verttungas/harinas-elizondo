import { PrismaClient, RolUsuario } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('fhesa123', 10);

  await prisma.$transaction(async (tx) => {
    // ------------------------------------------------------------------------
    // 1. Usuarios (5, uno por rol)
    // ------------------------------------------------------------------------
    const usuarioLab = await tx.usuario.create({
      data: {
        correo: 'lab@fhesa.mx',
        passwordHash,
        nombre: 'Ana López Martínez',
        rol: RolUsuario.LABORATORIO,
      },
    });

    const usuarioControl = await tx.usuario.create({
      data: {
        correo: 'control@fhesa.mx',
        passwordHash,
        nombre: 'Carlos Méndez Rivera',
        rol: RolUsuario.CONTROL_CALIDAD,
      },
    });

    await tx.usuario.create({
      data: {
        correo: 'calidad@fhesa.mx',
        passwordHash,
        nombre: 'Diana Ramírez Flores',
        rol: RolUsuario.ASEGURAMIENTO_CALIDAD,
      },
    });

    await tx.usuario.create({
      data: {
        correo: 'gerente@fhesa.mx',
        passwordHash,
        nombre: 'Eduardo Sánchez Torres',
        rol: RolUsuario.GERENTE_PLANTA,
      },
    });

    await tx.usuario.create({
      data: {
        correo: 'director@fhesa.mx',
        passwordHash,
        nombre: 'Fernanda Vázquez Cortés',
        rol: RolUsuario.DIRECTOR_OPERACIONES,
      },
    });

    const controlId = usuarioControl.id;

    // ------------------------------------------------------------------------
    // 2. Productos (3)
    // ------------------------------------------------------------------------
    await tx.producto.createMany({
      data: [
        { clave: 'HTR-000', nombre: 'Harina de trigo 000' },
        { clave: 'HTR-0000', nombre: 'Harina de trigo 0000' },
        { clave: 'HTR-INT', nombre: 'Harina integral' },
      ],
    });

    // ------------------------------------------------------------------------
    // 3. Equipos (2) + Parámetros (9)
    // ------------------------------------------------------------------------
    const equipoAlv = await tx.equipoLaboratorio.create({
      data: {
        clave: 'ALV-001',
        descripcionCorta: 'Alveógrafo Chopin AlveoLab',
        marca: 'Chopin Technologies',
        modelo: 'AlveoLab',
        serie: 'SN-ALV-001',
        proveedor: 'Tecnosa S.A.',
        ubicacion: 'Laboratorio A — Mesa 1',
        responsable: 'Ing. Carlos Méndez',
        creadoPor: controlId,
        actualizadoPor: controlId,
        parametros: {
          create: [
            {
              clave: 'W',
              nombre: 'Fuerza panadera',
              unidadMedida: 'x10⁻⁴ J',
              limiteInferior: 150,
              limiteSuperior: 400,
              desviacionAceptable: 5,
            },
            {
              clave: 'P',
              nombre: 'Tenacidad',
              unidadMedida: 'mm H2O',
              limiteInferior: 40,
              limiteSuperior: 100,
              desviacionAceptable: 2,
            },
            {
              clave: 'L',
              nombre: 'Extensibilidad',
              unidadMedida: 'mm',
              limiteInferior: 80,
              limiteSuperior: 160,
              desviacionAceptable: 3,
            },
            {
              clave: 'P/L',
              nombre: 'Relación tenacidad/extensibilidad',
              unidadMedida: 'adimensional',
              limiteInferior: 0.4,
              limiteSuperior: 1.2,
              desviacionAceptable: 0.05,
            },
          ],
        },
      },
      include: { parametros: true },
    });

    await tx.equipoLaboratorio.create({
      data: {
        clave: 'FAR-001',
        descripcionCorta: 'Farinógrafo Brabender Farinograph-TS',
        marca: 'Brabender',
        modelo: 'Farinograph-TS',
        serie: 'SN-FAR-001',
        proveedor: 'Brabender GmbH',
        ubicacion: 'Laboratorio A — Mesa 2',
        responsable: 'Ing. Carlos Méndez',
        creadoPor: controlId,
        actualizadoPor: controlId,
        parametros: {
          create: [
            {
              clave: 'ABS',
              nombre: 'Absorción de agua',
              unidadMedida: '%',
              limiteInferior: 55,
              limiteSuperior: 65,
              desviacionAceptable: 0.5,
            },
            {
              clave: 'TDM',
              nombre: 'Tiempo de desarrollo de la masa',
              unidadMedida: 'min',
              limiteInferior: 2,
              limiteSuperior: 8,
              desviacionAceptable: 0.2,
            },
            {
              clave: 'EST',
              nombre: 'Estabilidad',
              unidadMedida: 'min',
              limiteInferior: 5,
              limiteSuperior: 15,
              desviacionAceptable: 0.3,
            },
            {
              clave: 'GRB',
              nombre: 'Grado de reblandecimiento',
              unidadMedida: 'UB',
              limiteInferior: 30,
              limiteSuperior: 80,
              desviacionAceptable: 2,
            },
            {
              clave: 'FQN',
              nombre: 'Farinógrafo Quality Number',
              unidadMedida: 'adimensional',
              limiteInferior: 50,
              limiteSuperior: 100,
              desviacionAceptable: 3,
            },
          ],
        },
      },
    });

    const paramW = equipoAlv.parametros.find((p) => p.clave === 'W')!;
    const paramP = equipoAlv.parametros.find((p) => p.clave === 'P')!;
    const paramL = equipoAlv.parametros.find((p) => p.clave === 'L')!;
    const paramPL = equipoAlv.parametros.find((p) => p.clave === 'P/L')!;

    const paramABS = await tx.parametro.findFirstOrThrow({
      where: { clave: 'ABS' },
    });
    const paramFQN = await tx.parametro.findFirstOrThrow({
      where: { clave: 'FQN' },
    });

    // ------------------------------------------------------------------------
    // 4. Clientes (3)
    // ------------------------------------------------------------------------
    const clienteBimbo = await tx.cliente.create({
      data: {
        claveSap: 'C-00001',
        nombre: 'Grupo Bimbo SAB de CV',
        rfc: 'BIM601201A12',
        domicilio: 'Prol. Paseo de la Reforma 1000, CDMX',
        contactoNombre: 'Ing. Roberto Gutiérrez',
        contactoCorreo: 'compras@bimbo.fhesa.test',
        contactoTelefono: '5555010001',
        requiereCertificado: true,
        creadoPor: controlId,
        actualizadoPor: controlId,
      },
    });

    await tx.cliente.create({
      data: {
        claveSap: 'C-00002',
        nombre: 'Panadería Colón SA de CV',
        rfc: 'PCO850314XY5',
        domicilio: 'Av. Insurgentes Sur 500, CDMX',
        contactoNombre: 'Sr. Juan Colón',
        contactoCorreo: 'juan@colon.fhesa.test',
        contactoTelefono: '5555010002',
        requiereCertificado: true,
        creadoPor: controlId,
        actualizadoPor: controlId,
      },
    });

    const clienteEsperanza = await tx.cliente.create({
      data: {
        claveSap: 'C-00003',
        nombre: 'La Esperanza SA de CV',
        rfc: 'ESP910505ABC',
        domicilio: 'Calle Hidalgo 45, Toluca',
        contactoNombre: 'Lic. María Esperanza',
        contactoCorreo: 'contacto@esperanza.fhesa.test',
        contactoTelefono: '5555010003',
        requiereCertificado: true,
        creadoPor: controlId,
        actualizadoPor: controlId,
      },
    });

    // ------------------------------------------------------------------------
    // 5. ValoresReferenciaCliente (3)
    // ------------------------------------------------------------------------
    await tx.valorReferenciaCliente.create({
      data: {
        clienteId: clienteBimbo.id,
        parametroId: paramW.id,
        limiteInferior: 180,
        limiteSuperior: 380,
      },
    });

    await tx.valorReferenciaCliente.create({
      data: {
        clienteId: clienteBimbo.id,
        parametroId: paramABS.id,
        limiteInferior: 58,
        limiteSuperior: 63,
      },
    });

    await tx.valorReferenciaCliente.create({
      data: {
        clienteId: clienteEsperanza.id,
        parametroId: paramFQN.id,
        limiteInferior: 60,
        limiteSuperior: 95,
      },
    });

    // ------------------------------------------------------------------------
    // 6. Lotes de producción (3)
    // ------------------------------------------------------------------------
    const prodHtr000 = await tx.producto.findUniqueOrThrow({
      where: { clave: 'HTR-000' },
    });
    const prodHtr0000 = await tx.producto.findUniqueOrThrow({
      where: { clave: 'HTR-0000' },
    });

    const lote1 = await tx.loteProduccion.create({
      data: {
        numeroLote: 'L-2026-001',
        productoId: prodHtr000.id,
        fechaProduccion: new Date('2026-04-10'),
        cantidadProducida: 5000,
        unidadCantidad: 'kg',
        creadoPor: controlId,
      },
    });

    const lote2 = await tx.loteProduccion.create({
      data: {
        numeroLote: 'L-2026-002',
        productoId: prodHtr0000.id,
        fechaProduccion: new Date('2026-04-12'),
        cantidadProducida: 4500,
        unidadCantidad: 'kg',
        creadoPor: controlId,
      },
    });

    const lote3 = await tx.loteProduccion.create({
      data: {
        numeroLote: 'L-2026-003',
        productoId: prodHtr000.id,
        fechaProduccion: new Date('2026-04-13'),
        cantidadProducida: 5200,
        unidadCantidad: 'kg',
        creadoPor: controlId,
      },
    });

    // ------------------------------------------------------------------------
    // 7. Inspecciones (5) con secuencia explícita
    // ------------------------------------------------------------------------
    // Lote 1: solo A
    const insp1A = await tx.inspeccion.create({
      data: {
        loteId: lote1.id,
        secuencia: 'A',
        fechaInspeccion: new Date('2026-04-10T10:00:00Z'),
        estado: 'CERRADA',
        esFicticia: false,
        creadoPor: usuarioLab.id,
      },
    });

    // Lote 2: A, B
    const insp2A = await tx.inspeccion.create({
      data: {
        loteId: lote2.id,
        secuencia: 'A',
        fechaInspeccion: new Date('2026-04-12T09:30:00Z'),
        estado: 'CERRADA',
        esFicticia: false,
        creadoPor: usuarioLab.id,
      },
    });

    const insp2B = await tx.inspeccion.create({
      data: {
        loteId: lote2.id,
        secuencia: 'B',
        fechaInspeccion: new Date('2026-04-12T14:15:00Z'),
        estado: 'CERRADA',
        esFicticia: false,
        creadoPor: usuarioLab.id,
      },
    });

    // Lote 3: A (fuera de spec), B ficticia derivada de A
    const insp3A = await tx.inspeccion.create({
      data: {
        loteId: lote3.id,
        secuencia: 'A',
        fechaInspeccion: new Date('2026-04-13T10:00:00Z'),
        estado: 'CERRADA',
        esFicticia: false,
        creadoPor: usuarioLab.id,
      },
    });

    const insp3B = await tx.inspeccion.create({
      data: {
        loteId: lote3.id,
        secuencia: 'B',
        fechaInspeccion: new Date('2026-04-13T15:30:00Z'),
        estado: 'CERRADA',
        esFicticia: true,
        inspeccionOrigenId: insp3A.id,
        justificacionAjuste:
          'Ajuste por revisión: reprocesamiento del lote bajo condiciones controladas, retomada muestra representativa',
        creadoPor: usuarioLab.id,
      },
    });

    // ------------------------------------------------------------------------
    // 8. Resultados de inspección (20 = 4 por inspección, solo Alveógrafo)
    // El trigger calcula desviacion y dentroEspecificacion;
    // se pasa un valor dummy a dentroEspecificacion porque es NOT NULL.
    // ------------------------------------------------------------------------
    const resultadosPorInspeccion: Array<{
      inspeccionId: bigint;
      valores: { W: number; P: number; L: number; PL: number };
    }> = [
      { inspeccionId: insp1A.id, valores: { W: 275, P: 68, L: 115, PL: 0.59 } },
      { inspeccionId: insp2A.id, valores: { W: 290, P: 72, L: 120, PL: 0.6 } },
      { inspeccionId: insp2B.id, valores: { W: 295, P: 74, L: 122, PL: 0.61 } },
      { inspeccionId: insp3A.id, valores: { W: 145, P: 55, L: 90, PL: 0.61 } },
      { inspeccionId: insp3B.id, valores: { W: 200, P: 60, L: 100, PL: 0.6 } },
    ];

    for (const { inspeccionId, valores } of resultadosPorInspeccion) {
      await tx.resultadoInspeccion.createMany({
        data: [
          { inspeccionId, parametroId: paramW.id, valor: valores.W, dentroEspecificacion: false },
          { inspeccionId, parametroId: paramP.id, valor: valores.P, dentroEspecificacion: false },
          { inspeccionId, parametroId: paramL.id, valor: valores.L, dentroEspecificacion: false },
          { inspeccionId, parametroId: paramPL.id, valor: valores.PL, dentroEspecificacion: false },
        ],
      });
    }
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
