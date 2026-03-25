const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  const failed = await prisma.vocabItem.findMany({
    where: { audioStatus: "FAILED" },
    select: { id: true, position: true, arabicPrimary: true, english: true },
  });
  console.log(`Found ${failed.length} FAILED items:`);
  console.dir(failed, { depth: null });
  await prisma.$disconnect();
}

main().catch(console.error);
