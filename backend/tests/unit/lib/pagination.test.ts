import {
  buildPaginationResponse,
  parsePaginationQuery,
} from "../../../src/lib/pagination.js";

describe("parsePaginationQuery", () => {
  it("usa valores por defecto cuando no se proveen", () => {
    const p = parsePaginationQuery({});
    expect(p.page).toBe(1);
    expect(p.limit).toBe(20);
    expect(p.skip).toBe(0);
    expect(p.take).toBe(20);
  });

  it("calcula skip en función de page y limit", () => {
    const p = parsePaginationQuery({ page: 3, limit: 10 });
    expect(p.skip).toBe(20);
    expect(p.take).toBe(10);
  });

  it("acepta números en string", () => {
    const p = parsePaginationQuery({ page: "2", limit: "25" });
    expect(p.page).toBe(2);
    expect(p.limit).toBe(25);
    expect(p.skip).toBe(25);
  });

  it("cae al default si page es inválida", () => {
    const p = parsePaginationQuery({ page: -1, limit: 10 });
    expect(p.page).toBe(1);
  });

  it("trunca limit al máximo permitido (100)", () => {
    const p = parsePaginationQuery({ page: 1, limit: 1000 });
    expect(p.limit).toBe(100);
  });
});

describe("buildPaginationResponse", () => {
  it("calcula totalPages redondeando hacia arriba", () => {
    const r = buildPaginationResponse([1, 2, 3], 25, 1, 10);
    expect(r.pagination.totalPages).toBe(3);
  });

  it("retorna totalPages = 0 si limit = 0", () => {
    const r = buildPaginationResponse([], 0, 1, 0);
    expect(r.pagination.totalPages).toBe(0);
  });

  it("respeta los datos entregados en data", () => {
    const data = [{ id: 1n }, { id: 2n }];
    const r = buildPaginationResponse(data, 2, 1, 20);
    expect(r.data).toBe(data);
    expect(r.pagination.total).toBe(2);
  });
});
