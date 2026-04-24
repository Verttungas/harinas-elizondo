import "../../../src/lib/json.js";

describe("BigInt JSON serialization", () => {
  it("serializa BigInt como string al usar JSON.stringify", () => {
    const obj = { id: 12345678901234567890n, nombre: "X" };
    const json = JSON.stringify(obj);
    expect(json).toBe('{"id":"12345678901234567890","nombre":"X"}');
  });

  it("serializa BigInt cero correctamente", () => {
    expect(JSON.stringify({ v: 0n })).toBe('{"v":"0"}');
  });
});
