declare global {
  interface BigInt {
    toJSON(): string;
  }
}

// Prisma uses BigInt for primary keys; JSON.stringify does not support BigInt
// natively. Serialize as strings to keep precision across the HTTP boundary.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function (
  this: bigint,
) {
  return this.toString();
};

export function serialize<T>(value: T): string {
  return JSON.stringify(value);
}

export {};
