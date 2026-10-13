import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
try {
  const n = await db.pengajuan.count();
  console.log("count:", n);
  const rows = await db.pengajuan.findMany({
    include: {
      jenis: { select: { namaJenis: true } },
      pemohon: { select: { namaLengkap: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  console.log("rows:", rows.length);
  const first = rows[0];
  if (first) {
    console.log("keys:", Object.keys(first).join(","));
    console.log("status:", first.status, "| jenis:", first.jenis?.namaJenis, "| pemohon:", first.pemohon?.namaLengkap);
    let f = {};
    try { f = JSON.parse(first.dataFormJson || "{}"); } catch {}
    console.log("form keys:", Object.keys(f).join(","));
  }
} catch (e) {
  console.error("ERR:", e.message);
} finally {
  await db.$disconnect();
}
