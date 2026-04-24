import { prisma } from "../src/lib/prisma.js";

afterAll(async () => {
  await prisma.$disconnect();
});
