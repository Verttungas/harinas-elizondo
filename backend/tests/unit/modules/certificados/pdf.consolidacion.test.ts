import { consolidarResultados } from "../../../../src/modules/certificados/pdf.service.js";

const parametroW = {
  clave: "W",
  nombre: "Fuerza panadera",
  unidadMedida: "x10⁻⁴ J",
  limiteInferior: "200",
  limiteSuperior: "350",
};

describe("consolidarResultados — desviación contra rango aplicable (Obs-007 bug 4)", () => {
  it("usa midpoint del rango cliente cuando el cliente tiene valor de referencia particular", () => {
    const inspecciones = [
      {
        secuencia: "A",
        esFicticia: false,
        resultados: [
          {
            parametroId: 1n,
            valor: 220,
            parametro: parametroW,
          },
        ],
      },
    ];
    const valoresReferencia = [
      { parametroId: 1n, limiteInferior: "201", limiteSuperior: "220" },
    ];

    const filas = consolidarResultados(inspecciones, valoresReferencia);

    expect(filas).toHaveLength(1);
    const w = filas[0]!;
    expect(w.rango.origen).toBe("cliente");
    expect(w.rango.limiteInferior).toBe("201");
    expect(w.rango.limiteSuperior).toBe("220");
    // midpoint cliente = (201 + 220) / 2 = 210.5; desviación = 220 - 210.5 = 9.5
    expect(Number(w.desviacion)).toBeCloseTo(9.5, 4);
    expect(w.dentroEspecificacion).toBe(true);
  });

  it("usa midpoint del rango internacional cuando el cliente no tiene valor de referencia para el parámetro", () => {
    const inspecciones = [
      {
        secuencia: "A",
        esFicticia: false,
        resultados: [
          {
            parametroId: 2n,
            valor: 220,
            parametro: parametroW,
          },
        ],
      },
    ];

    const filas = consolidarResultados(inspecciones, []);

    expect(filas).toHaveLength(1);
    const w = filas[0]!;
    expect(w.rango.origen).toBe("internacional");
    // midpoint internacional = (200 + 350) / 2 = 275; desviación = 220 - 275 = -55
    expect(Number(w.desviacion)).toBeCloseTo(-55, 4);
    expect(w.dentroEspecificacion).toBe(true);
  });

  it("marca dentroEspecificacion=false si el valor cae fuera del rango cliente aunque esté dentro del internacional", () => {
    const inspecciones = [
      {
        secuencia: "A",
        esFicticia: false,
        resultados: [
          {
            parametroId: 1n,
            valor: 250,
            parametro: parametroW,
          },
        ],
      },
    ];
    const valoresReferencia = [
      { parametroId: 1n, limiteInferior: "201", limiteSuperior: "220" },
    ];

    const filas = consolidarResultados(inspecciones, valoresReferencia);

    expect(filas[0]!.dentroEspecificacion).toBe(false);
    // midpoint cliente = 210.5; desviación = 250 - 210.5 = 39.5
    expect(Number(filas[0]!.desviacion)).toBeCloseTo(39.5, 4);
  });

  it("la inspección ficticia sobreescribe a la original al consolidar", () => {
    const inspecciones = [
      {
        secuencia: "A",
        esFicticia: false,
        resultados: [
          {
            parametroId: 1n,
            valor: 100,
            parametro: parametroW,
          },
        ],
      },
      {
        secuencia: "B",
        esFicticia: true,
        resultados: [
          {
            parametroId: 1n,
            valor: 220,
            parametro: parametroW,
          },
        ],
      },
    ];

    const filas = consolidarResultados(inspecciones, []);

    expect(filas).toHaveLength(1);
    expect(Number(filas[0]!.valor)).toBe(220);
  });
});
