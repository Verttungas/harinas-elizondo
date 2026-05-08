import { PrismaClient, RolUsuario } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function createDeterministicRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

async function main() {
  const passwordHash = await bcrypt.hash('fhesa123', 10);

  await prisma.$transaction(async (tx) => {
    // ------------------------------------------------------------------------
    // 0. Limpieza completa (orden seguro vía CASCADE)
    // ------------------------------------------------------------------------
    await tx.$executeRawUnsafe(`
      TRUNCATE TABLE
        bitacora,
        envios_certificado,
        certificado_inspeccion,
        certificados,
        resultados_inspeccion,
        inspecciones,
        lotes_produccion,
        valores_referencia_cliente,
        parametros,
        equipos_laboratorio,
        clientes,
        productos,
        reportes_guardados,
        usuarios
      RESTART IDENTITY CASCADE
    `);

    const random = createDeterministicRandom(20260508);

    // ------------------------------------------------------------------------
    // 1. Usuarios (6, uno por rol)
    // ------------------------------------------------------------------------
    const usuarioAdmin = await tx.usuario.create({
      data: {
        correo: 'admin@fhesa.mx',
        passwordHash,
        nombre: 'Administradora FHESA',
        rol: RolUsuario.ADMINISTRADOR,
      },
    });

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
        { clave: 'HTR-000', nombre: 'Harina de trigo 000', descripcion: 'Harina panificable estándar' },
        { clave: 'HTR-0000', nombre: 'Harina de trigo 0000', descripcion: 'Harina refinada para repostería' },
        { clave: 'HTR-INT', nombre: 'Harina integral', descripcion: 'Harina con salvado' },
      ],
    });

    // ------------------------------------------------------------------------
    // 3. Equipos (3) + Parámetros (10)
    // ------------------------------------------------------------------------
    const equipoAlv = await tx.equipoLaboratorio.create({
      data: {
        clave: 'ALV-001',
        descripcionCorta: 'Alveógrafo Chopin AlveoLab',
        descripcionLarga:
          'Equipo para medición de propiedades reológicas de masas mediante deformación biaxial.',
        marca: 'Chopin Technologies',
        modelo: 'AlveoLab',
        serie: 'SN-ALV-001',
        proveedor: 'Tecnosa S.A.',
        fechaAdquisicion: new Date(Date.UTC(2023, 2, 15)),
        vigenciaGarantia: new Date(Date.UTC(2026, 2, 15)),
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

    const equipoFar = await tx.equipoLaboratorio.create({
      data: {
        clave: 'FAR-001',
        descripcionCorta: 'Farinógrafo Brabender Farinograph-TS',
        descripcionLarga: 'Mide absorción de agua y comportamiento de la masa durante el amasado.',
        marca: 'Brabender',
        modelo: 'Farinograph-TS',
        serie: 'SN-FAR-001',
        proveedor: 'Brabender GmbH',
        fechaAdquisicion: new Date(Date.UTC(2022, 7, 1)),
        vigenciaGarantia: new Date(Date.UTC(2025, 7, 1)),
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
      include: { parametros: true },
    });

    // Equipo dado de BAJA (para que el listado muestre el estado)
    await tx.equipoLaboratorio.create({
      data: {
        clave: 'HUM-001',
        descripcionCorta: 'Termobalanza humedad (en baja)',
        marca: 'Mettler Toledo',
        modelo: 'HE53',
        serie: 'SN-HUM-001',
        ubicacion: 'Laboratorio A — Bodega',
        responsable: 'Ing. Carlos Méndez',
        estado: 'BAJA',
        motivoBaja: 'Equipo reemplazado por modelo HE73 en marzo 2026.',
        fechaAdquisicion: new Date(Date.UTC(2018, 0, 10)),
        creadoPor: controlId,
        actualizadoPor: controlId,
        parametros: {
          create: [
            {
              clave: 'HUM',
              nombre: 'Humedad',
              unidadMedida: '%',
              limiteInferior: 11,
              limiteSuperior: 15,
              desviacionAceptable: 0.3,
              activo: false,
            },
          ],
        },
      },
    });

    const paramW = equipoAlv.parametros.find((p) => p.clave === 'W')!;
    const paramP = equipoAlv.parametros.find((p) => p.clave === 'P')!;
    const paramL = equipoAlv.parametros.find((p) => p.clave === 'L')!;
    const paramPL = equipoAlv.parametros.find((p) => p.clave === 'P/L')!;
    const paramABS = equipoFar.parametros.find((p) => p.clave === 'ABS')!;
    const paramFQN = equipoFar.parametros.find((p) => p.clave === 'FQN')!;

    // ------------------------------------------------------------------------
    // 4. Clientes (4 activos + 1 inactivo)
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
        creadoPor: controlId,
        actualizadoPor: controlId,
      },
    });

    const clientePanaderia = await tx.cliente.create({
      data: {
        claveSap: 'C-00002',
        nombre: 'Panadería Colón SA de CV',
        rfc: 'PCO850314XY5',
        domicilio: 'Av. Insurgentes Sur 500, CDMX',
        contactoNombre: 'Sr. Juan Colón',
        contactoCorreo: 'juan@colon.fhesa.test',
        contactoTelefono: '5555010002',
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
        creadoPor: controlId,
        actualizadoPor: controlId,
      },
    });

    const clienteRosca = await tx.cliente.create({
      data: {
        claveSap: 'C-00004',
        nombre: 'Pastelerías La Rosca SA de CV',
        rfc: 'RSC780614PT9',
        domicilio: 'Av. Juárez 220, Puebla',
        contactoNombre: 'Sra. Verónica Núñez',
        contactoCorreo: 'compras@rosca.fhesa.test',
        contactoTelefono: '5555010004',
        creadoPor: controlId,
        actualizadoPor: controlId,
      },
    });

    await tx.cliente.create({
      data: {
        claveSap: 'C-00099',
        nombre: 'Distribuidora del Norte SA',
        rfc: 'DNO720902LM3',
        domicilio: 'Carretera Saltillo Km 12, Monterrey',
        contactoNombre: 'Sr. Luis Treviño',
        contactoCorreo: 'luis@delnorte.fhesa.test',
        estado: 'INACTIVO',
        motivoInactivacion: 'Cuenta dada de baja por incumplimiento de pagos en abril 2026.',
        creadoPor: controlId,
        actualizadoPor: controlId,
      },
    });

    // ------------------------------------------------------------------------
    // 5. Valores de referencia por cliente
    // ------------------------------------------------------------------------
    await tx.valorReferenciaCliente.createMany({
      data: [
        { clienteId: clienteBimbo.id, parametroId: paramW.id, limiteInferior: 180, limiteSuperior: 380 },
        { clienteId: clienteBimbo.id, parametroId: paramABS.id, limiteInferior: 58, limiteSuperior: 63 },
        { clienteId: clienteBimbo.id, parametroId: paramFQN.id, limiteInferior: 65, limiteSuperior: 95 },
        { clienteId: clienteEsperanza.id, parametroId: paramFQN.id, limiteInferior: 60, limiteSuperior: 95 },
        { clienteId: clienteEsperanza.id, parametroId: paramW.id, limiteInferior: 200, limiteSuperior: 360 },
        { clienteId: clienteRosca.id, parametroId: paramABS.id, limiteInferior: 56, limiteSuperior: 62 },
      ],
    });

    // ------------------------------------------------------------------------
    // 6. Lotes, inspecciones y certificados (Enero–Mayo 2026)
    // ------------------------------------------------------------------------
    const prodHtr000 = await tx.producto.findUniqueOrThrow({ where: { clave: 'HTR-000' } });
    const prodHtr0000 = await tx.producto.findUniqueOrThrow({ where: { clave: 'HTR-0000' } });
    const prodHtrInt = await tx.producto.findUniqueOrThrow({ where: { clave: 'HTR-INT' } });
    const productos = [prodHtr000, prodHtr0000, prodHtrInt];

    const clientes = [clienteBimbo, clientePanaderia, clienteEsperanza, clienteRosca];

    let loteIndex = 1;
    let certIndex = 1;

    for (let mes = 0; mes <= 4; mes++) {
      const numLotes = 8 + Math.floor(random() * 5);

      for (let i = 0; i < numLotes; i++) {
        const diaProduccion = 1 + Math.floor(random() * 25);
        const fechaProduccion = new Date(Date.UTC(2026, mes, diaProduccion, 8, 0, 0));

        const prod = productos[Math.floor(random() * productos.length)];
        const cantidadProd = 3000 + Math.floor(random() * 7000);

        const lote = await tx.loteProduccion.create({
          data: {
            numeroLote: `L-2026-${String(loteIndex).padStart(3, '0')}`,
            productoId: prod.id,
            fechaProduccion,
            cantidadProducida: cantidadProd,
            unidadCantidad: 'kg',
            creadoPor: controlId,
          },
        });
        loteIndex++;

        const fechaInsp = new Date(fechaProduccion);
        fechaInsp.setUTCDate(fechaInsp.getUTCDate() + 1);

        const dejarEnBorrador = random() < 0.05;

        let inspeccion = await tx.inspeccion.create({
          data: {
            loteId: lote.id,
            secuencia: 'A',
            fechaInspeccion: fechaInsp,
            estado: dejarEnBorrador ? 'BORRADOR' : 'CERRADA',
            observaciones: dejarEnBorrador ? 'Pendiente de validación final.' : null,
            creadoPor: usuarioLab.id,
          },
        });

        const fallaPrimera = !dejarEnBorrador && random() < 0.12;
        const wVal = fallaPrimera ? 100 : 250 + random() * 100;

        await tx.resultadoInspeccion.createMany({
          data: [
            { inspeccionId: inspeccion.id, parametroId: paramW.id, valor: wVal, dentroEspecificacion: !fallaPrimera },
            { inspeccionId: inspeccion.id, parametroId: paramP.id, valor: 70, dentroEspecificacion: true },
            { inspeccionId: inspeccion.id, parametroId: paramL.id, valor: 110, dentroEspecificacion: true },
            { inspeccionId: inspeccion.id, parametroId: paramPL.id, valor: 0.63, dentroEspecificacion: true },
          ],
        });

        if (fallaPrimera) {
          const fechaInspB = new Date(fechaInsp);
          fechaInspB.setUTCHours(fechaInspB.getUTCHours() + 5);

          inspeccion = await tx.inspeccion.create({
            data: {
              loteId: lote.id,
              secuencia: 'B',
              fechaInspeccion: fechaInspB,
              estado: 'CERRADA',
              observaciones: 'Reinspección tras ajuste de proceso (ficticia).',
              creadoPor: usuarioLab.id,
            },
          });

          await tx.resultadoInspeccion.createMany({
            data: [
              { inspeccionId: inspeccion.id, parametroId: paramW.id, valor: 280, dentroEspecificacion: true },
              { inspeccionId: inspeccion.id, parametroId: paramP.id, valor: 70, dentroEspecificacion: true },
              { inspeccionId: inspeccion.id, parametroId: paramL.id, valor: 110, dentroEspecificacion: true },
              { inspeccionId: inspeccion.id, parametroId: paramPL.id, valor: 0.63, dentroEspecificacion: true },
            ],
          });
        }

        const loteReservado = lote.numeroLote === 'L-2026-001';

        if (!dejarEnBorrador && !loteReservado && random() < 0.85) {
          const fechaEmision = new Date(inspeccion.fechaInspeccion);
          fechaEmision.setUTCDate(fechaEmision.getUTCDate() + 1 + Math.floor(random() * 3));

          const cliente = clientes[Math.floor(random() * clientes.length)];
          const cantidadPedida = Math.floor(cantidadProd * (0.5 + random() * 0.5));

          const r = random();
          let estadoCert: 'EMITIDO' | 'ENVIO_PARCIAL' | 'ENVIADO';
          let estadoEnvio: 'PENDIENTE' | 'ENVIADO' | 'FALLIDO';
          let intentosEnvio: number;
          let enviadoEn: Date | null;
          let ultimoError: string | null = null;
          if (r < 0.1) {
            estadoCert = 'EMITIDO';
            estadoEnvio = 'PENDIENTE';
            intentosEnvio = 0;
            enviadoEn = null;
          } else if (r < 0.25) {
            estadoCert = 'ENVIO_PARCIAL';
            estadoEnvio = 'FALLIDO';
            intentosEnvio = 1;
            enviadoEn = null;
            ultimoError = 'SMTP 550: buzón lleno o dirección no válida.';
          } else {
            estadoCert = 'ENVIADO';
            estadoEnvio = 'ENVIADO';
            intentosEnvio = 1;
            enviadoEn = new Date(fechaEmision.getTime() + 3600000);
          }

          await tx.certificado.create({
            data: {
              numero: `CERT-2026-${String(certIndex).padStart(6, '0')}`,
              clienteId: cliente.id,
              loteId: lote.id,
              fechaEmision,
              estado: estadoCert,
              rutaPdf: `certificados-pdf/2026/${String(mes + 1).padStart(2, '0')}/CERT-2026-${String(certIndex).padStart(6, '0')}.pdf`,
              numOrdenCompra: `OC-${1000 + Math.floor(random() * 9000)}`,
              cantidadSolicitada: cantidadPedida,
              cantidadEntrega: cantidadPedida,
              numFactura: `FAC-${8000 + certIndex}`,
              direccionEnvio: cliente.domicilio,
              fechaEnvio: estadoCert === 'ENVIADO' ? new Date(fechaEmision.getTime() + 86400000) : null,
              fechaCaducidad: new Date(fechaEmision.getTime() + 180 * 86400000),
              creadoPor: controlId,
              certificadoInspeccion: {
                create: [{ inspeccionId: inspeccion.id, orden: 1 }],
              },
              envios: {
                create: [
                  {
                    destinatarioTipo: 'CLIENTE',
                    destinatarioCorreo: cliente.contactoCorreo ?? 'ventas@fhesa.test',
                    estado: estadoEnvio,
                    intentos: intentosEnvio,
                    enviadoEn,
                    ultimoError,
                  },
                ],
              },
            },
          });
          certIndex++;
        }
      }
    }

    // ------------------------------------------------------------------------
    // 7. Reportes guardados (vistas predefinidas)
    // ------------------------------------------------------------------------
    await tx.reporteGuardado.createMany({
      data: [
        {
          nombre: 'Certificados emitidos del mes',
          descripcion: 'Vista por defecto del director de operaciones.',
          tipo: 'CERTIFICADOS',
          filtros: { rangoMes: 'actual' },
          creadoPor: usuarioAdmin.id,
        },
        {
          nombre: 'Lotes con saldo pendiente',
          descripcion: 'Lotes producidos sin certificado emitido.',
          tipo: 'LOTES',
          filtros: { conCertificado: false },
          creadoPor: controlId,
        },
        {
          nombre: 'Envíos fallidos',
          descripcion: 'Envíos de certificado a reintentar.',
          tipo: 'ENVIOS',
          filtros: { estado: 'FALLIDO' },
          creadoPor: controlId,
        },
      ],
    });
  });

  console.log('Seed completado: usuarios, productos, equipos, clientes, lotes, inspecciones y certificados generados.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
