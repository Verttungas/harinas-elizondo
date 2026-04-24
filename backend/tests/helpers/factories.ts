import type { CrearClienteInput } from "../../src/modules/clientes/clientes.schemas.js";
import type { CrearEquipoInput } from "../../src/modules/equipos/equipos.schemas.js";

export function equipoInput(overrides: Partial<CrearEquipoInput> = {}): CrearEquipoInput {
  return {
    clave: "EQ-TEST-01",
    descripcionCorta: "Equipo de prueba",
    parametros: [
      {
        clave: "PX",
        nombre: "Parámetro de prueba",
        unidadMedida: "u",
        limiteInferior: 10,
        limiteSuperior: 20,
        desviacionAceptable: 0.5,
      },
    ],
    ...overrides,
  } as CrearEquipoInput;
}

export function clienteInput(overrides: Partial<CrearClienteInput> = {}): CrearClienteInput {
  return {
    claveSap: "C-TEST-01",
    nombre: "Cliente de prueba",
    rfc: "TST010101ABC",
    contactoCorreo: "cliente@test.mx",
    requiereCertificado: true,
    ...overrides,
  } as CrearClienteInput;
}
