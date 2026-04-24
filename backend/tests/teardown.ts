export default async function teardown(): Promise<void> {
  // The prisma client is disconnected per-suite in setup.ts. Placeholder for
  // any future global cleanup (e.g. dropping the test schema).
}
