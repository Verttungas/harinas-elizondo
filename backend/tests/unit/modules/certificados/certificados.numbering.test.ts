import { jest } from "@jest/globals";
import { generarNumeroCertificado } from "../../../../src/modules/certificados/certificados.numbering.js";

describe("generarNumeroCertificado", () => {
  const originalDate = Date;

  beforeAll(() => {
    // Congelamos el año en 2026 para que el prefijo sea determinístico.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.Date = class extends originalDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) {
          super("2026-04-23T00:00:00Z");
          return;
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        super(...args);
      }
    } as unknown as typeof Date;
  });

  afterAll(() => {
    global.Date = originalDate;
  });

  it("genera un número con prefijo CERT-AAAA- y consecutivo de 6 dígitos", async () => {
    const count = jest.fn<() => Promise<number>>().mockResolvedValue(0);
    const db = { certificado: { count } } as never;

    const numero = await generarNumeroCertificado(db);

    expect(numero).toBe("CERT-2026-000001");
    expect(count).toHaveBeenCalledTimes(1);
    const args = count.mock.calls[0]?.[0] as { where: { numero: { startsWith: string } } };
    expect(args.where.numero.startsWith).toBe("CERT-2026-");
  });

  it("usa (count + 1) como consecutivo rellenado con ceros", async () => {
    const count = jest.fn<() => Promise<number>>().mockResolvedValue(42);
    const db = { certificado: { count } } as never;

    const numero = await generarNumeroCertificado(db);
    expect(numero).toBe("CERT-2026-000043");
  });

  it("maneja consecutivos grandes sin truncar", async () => {
    const count = jest.fn<() => Promise<number>>().mockResolvedValue(999_998);
    const db = { certificado: { count } } as never;

    const numero = await generarNumeroCertificado(db);
    expect(numero).toBe("CERT-2026-999999");
  });
});
