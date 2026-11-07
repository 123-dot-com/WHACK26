import { prisma } from "../src/lib/prisma.ts";

const stocks = [
  { id: "NOVA", name: "Nova AI", sector: "TECH", volatility: 1.2, initialPricePence: 10000 },
  { id: "GREEN", name: "GreenGrid Energy", sector: "ENERGY", volatility: 0.8, initialPricePence: 5000 },
  { id: "FINX", name: "FinX Bank", sector: "FINANCE", volatility: 1.0, initialPricePence: 7500 },
] as const;

try {
  await prisma.$transaction(
    stocks.map((stock) => prisma.stock.upsert({
      where: { id: stock.id },
      update: stock,
      create: stock,
    })),
  );
  console.log("Seeded NOVA, GREEN and FINX.");
} finally {
  await prisma.$disconnect();
}
