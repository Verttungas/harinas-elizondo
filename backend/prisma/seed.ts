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
    const random = createDeterministicRandom(20260501);
    // ------------------------------------------------------------------------
    // 1. Usuarios (6, uno por rol)
    // ------------------------------------------------------------------------
    await tx.usuario.create({
      data: {
        correo: 'admin@fhesa.mx',
        passwordHash,
        nombre: 'Administradora FHESA',
        rol: 'ADMINISTRADOR' as RolUsuario,
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
    // 6. Generador pseudoaleatorio determinístico (5 Meses: Enero 2026 - Mayo 2026)
    // ------------------------------------------------------------------------
    const prodHtr000 = await tx.producto.findUniqueOrThrow({ where: { clave: 'HTR-000' } });
    const prodHtr0000 = await tx.producto.findUniqueOrThrow({ where: { clave: 'HTR-0000' } });
    const prodHtrInt = await tx.producto.findUniqueOrThrow({ where: { clave: 'HTR-INT' } });
    const productos = [prodHtr000, prodHtr0000, prodHtrInt];

    const clientePanaderia = await tx.cliente.findFirstOrThrow({ where: { claveSap: 'C-00002' } });
    const clientes = [clienteBimbo, clienteEsperanza, clientePanaderia];

    let loteIndex = 1;
    let certIndex = 1;

    for (let mes = 0; mes <= 4; mes++) { // Enero (0) a Mayo (4)
      const numLotes = 8 + Math.floor(random() * 5); // 8 a 12 lotes por mes
      
      for (let i = 0; i < numLotes; i++) {
        const diaProduccion = 1 + Math.floor(random() * 25);
        const fechaProduccion = new Date(Date.UTC(2026, mes, diaProduccion, 8, 0, 0));
        
        const prod = productos[Math.floor(random() * productos.length)];
        const cantidadProd = 3000 + Math.floor(random() * 7000); // 3000 a 10000 kg

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

        // Inspección inicial A (al día siguiente de producción)
        const fechaInsp = new Date(fechaProduccion);
        fechaInsp.setUTCDate(fechaInsp.getUTCDate() + 1);
        
        let inspeccion = await tx.inspeccion.create({
          data: {
            loteId: lote.id,
            secuencia: 'A',
            fechaInspeccion: fechaInsp,
            estado: 'CERRADA',
            creadoPor: usuarioLab.id,
          },
        });

        // 10% de probabilidad de salir fuera de especificación (necesita inspección B)
        const fallaPrimera = random() < 0.1;

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
          fechaInspB.setUTCHours(fechaInspB.getUTCHours() + 5); // 5 horas después
          
          inspeccion = await tx.inspeccion.create({
            data: {
              loteId: lote.id,
              secuencia: 'B',
              fechaInspeccion: fechaInspB,
              estado: 'CERRADA',
              creadoPor: usuarioLab.id,
            },
          });
          
          // La B ya pasa
          await tx.resultadoInspeccion.createMany({
            data: [
              { inspeccionId: inspeccion.id, parametroId: paramW.id, valor: 280, dentroEspecificacion: true },
              { inspeccionId: inspeccion.id, parametroId: paramP.id, valor: 70, dentroEspecificacion: true },
              { inspeccionId: inspeccion.id, parametroId: paramL.id, valor: 110, dentroEspecificacion: true },
              { inspeccionId: inspeccion.id, parametroId: paramPL.id, valor: 0.63, dentroEspecificacion: true },
            ],
          });
        }

        // Certificado: 85% de probabilidad de emitir uno (dejamos algunos lotes con saldo para ver el KPI de "Saldo Global")
        const loteReservadoParaE2E = lote.numeroLote === 'L-2026-001';

        if (!loteReservadoParaE2E && random() < 0.85) {
          const fechaEmision = new Date(inspeccion.fechaInspeccion);
          // Emisión 1 a 3 días después de la inspección
          fechaEmision.setUTCDate(fechaEmision.getUTCDate() + 1 + Math.floor(random() * 3));
          
          const cliente = clientes[Math.floor(random() * clientes.length)];
          const cantidadPedida = Math.floor(cantidadProd * (0.5 + random() * 0.5)); // Piden del 50% al 100% del lote

          const esPendiente = random() < 0.1; // 10% de envíos pendientes

          await tx.certificado.create({
            data: {
              numero: `CERT-2026-${String(certIndex).padStart(6, '0')}`,
              clienteId: cliente.id,
              loteId: lote.id,
              fechaEmision,
              estado: esPendiente ? 'EMITIDO' : 'ENVIADO',
              rutaPdf: `certificados-pdf/2026/${String(mes + 1).padStart(2, '0')}/CERT-2026-${String(certIndex).padStart(6, '0')}.pdf`,
              numOrdenCompra: `OC-${Math.floor(random() * 10000)}`,
              cantidadSolicitada: cantidadPedida,
              cantidadEntrega: cantidadPedida,
              numFactura: `FAC-${8000 + certIndex}`,
              fechaEnvio: esPendiente ? null : new Date(fechaEmision.getTime() + 86400000), // 1 día después
              fechaCaducidad: new Date(fechaEmision.getTime() + (180 * 86400000)), // 6 meses después
              creadoPor: controlId,
              certificadoInspeccion: {
                create: [{ inspeccionId: inspeccion.id, orden: 1 }]
              },
              envios: {
                create: [{
                  destinatarioTipo: 'CLIENTE',
                  destinatarioCorreo: 'ventas@fhesa.test',
                  estado: esPendiente ? 'PENDIENTE' : 'ENVIADO',
                  intentos: esPendiente ? 0 : 1,
                  enviadoEn: esPendiente ? null : new Date(fechaEmision.getTime() + 3600000)
                }]
              }
            }
          });
          certIndex++;
        }
      }
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
