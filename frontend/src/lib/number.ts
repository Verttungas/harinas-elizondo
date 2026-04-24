export function toNumber(
  v: string | number | null | undefined,
): number {
  if (v === null || v === undefined || v === "") return 0;
  return typeof v === "number" ? v : Number(v);
}

export function evaluarValor(
  valor: number,
  limiteInferior: number,
  limiteSuperior: number,
): "OK" | "FUERA" {
  return valor >= limiteInferior && valor <= limiteSuperior ? "OK" : "FUERA";
}
