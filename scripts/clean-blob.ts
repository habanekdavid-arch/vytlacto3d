import { del } from "@vercel/blob";
import { prisma } from "../lib/prisma.ts";

const TARGET_EMAIL = "habanekdavid@gmail.com";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
  if (!user) {
    console.log(`Používateľ ${TARGET_EMAIL} neexistuje, niet čo mazať.`);
    await prisma.$disconnect();
    return;
  }

  const orders = await prisma.order.findMany({
    where: { customerEmail: TARGET_EMAIL },
    select: {
      id: true,
      fileKey: true,
      orderItems: { select: { fileKey: true } },
    },
  });

  if (orders.length === 0) {
    console.log(`${TARGET_EMAIL} nemá žiadne objednávky, niet čo mazať.`);
    await prisma.$disconnect();
    return;
  }

  // ── 1. BLOB — zmaž len súbory patriace objednávkam habanekdavid@gmail.com ──
  console.log("Čistím Blob storage (len moje testovacie objednávky)...");
  const fileKeys = new Set<string>();
  for (const order of orders) {
    fileKeys.add(order.fileKey);
    for (const item of order.orderItems) fileKeys.add(item.fileKey);
  }

  const blobUrls = [...fileKeys].filter((k) => k.startsWith("http://") || k.startsWith("https://"));
  const skipped = fileKeys.size - blobUrls.length;

  let blobCount = 0;
  for (const url of blobUrls) {
    try {
      await del(url);
      console.log("ZMAZANÝ blob:", url);
      blobCount++;
    } catch (err) {
      console.error("Chyba pri mazaní blobu:", url, err);
    }
  }
  console.log(`Blob hotovo — zmazaných ${blobCount} súborov (${skipped} neboli blob URL, preskočené)\n`);

  // ── 2. DB — zmaž faktúry a objednávky patriace habanekdavid@gmail.com ──
  console.log("Čistím testovacie objednávky...");
  const orderIds = orders.map((o) => o.id);

  // Faktúry majú FK na Order bez CASCADE — treba ich zmazať pred objednávkami
  // (najprv dobropisy, ktoré odkazujú na pôvodnú faktúru, potom zvyšok).
  await prisma.invoice.deleteMany({
    where: { orderId: { in: orderIds }, creditNoteForId: { not: null } },
  });
  const deletedInvoices = await prisma.invoice.deleteMany({
    where: { orderId: { in: orderIds } },
  });

  const deleted = await prisma.order.deleteMany({
    where: { customerEmail: TARGET_EMAIL },
  });
  console.log(`DB hotovo — zmazaných ${deleted.count} objednávok, ${deletedInvoices.count} faktúr\n`);

  await prisma.$disconnect();
  console.log("✅ Všetko hotovo.");
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
