/**
 * Bersihkan data sisa e2e-test dari DB demo (tanpa restart server).
 * Hapus pengajuan yang dibuat skrip uji (judul mengandung penanda [E2E]),
 * beserta tracking & dokumen & notifikasi terkait.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const uji = await db.pengajuan.findMany({
    where: { judulPengajuan: { contains: "E2E" } },
    select: { id: true, judulPengajuan: true },
  });
  for (const p of uji) {
    await db.trackingStatus.deleteMany({ where: { pengajuanId: p.id } });
    await db.dokumenPendukung.deleteMany({ where: { pengajuanId: p.id } });
    await db.notification.deleteMany({
      where: { OR: [{ pengajuanId: p.id }, { pengajuanId: null }] },
    });
    await db.pengajuan.delete({ where: { id: p.id } });
    console.log("dihapus:", p.id, "—", p.judulPengajuan);
  }
  const sisa = await db.pengajuan.count();
  const notif = await db.notification.count();
  console.log(`sisa pengajuan: ${sisa}, notifikasi: ${notif}`);
}

main().finally(() => db.$disconnect());
