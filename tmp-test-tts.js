const { PrismaClient } = require("@prisma/client");
const tts = require("./lib/tts");

async function testGeneration() {
  const prisma = new PrismaClient();
  const items = await prisma.vocabItem.findMany({
    orderBy: { position: "asc" },
    take: 10,
  });

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`\nTesting word ${i + 1}: ${item.arabicPrimary} - ${item.english}`);
    try {
      // Mock MOCK_TTS locally for this script
      process.env.MOCK_TTS = "false"; 
      const url = await tts.generateTts(item.id, item.arabicPrimary, item.english);
      console.log(`Success! ${url}`);
    } catch (e) {
      console.error(`FAILED: ${e.message}`);
    }
  }
  await prisma.$disconnect();
}

testGeneration();
