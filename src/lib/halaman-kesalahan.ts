// E-REKOM — Halaman kesalahan ramah (bukan JSON mentah) untuk route penyaji berkas
// yang biasanya dibuka di tab baru (mis. /api/files/{id}, /api/rekom-terbit/{id}).
export function halamanKesalahan(judul: string, pesan: string, status: number, tombolMasuk = false): Response {
  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${judul} — E-REKOM Dinkes Kukar</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    background: linear-gradient(135deg, #0f3d3a, #14655e, #157a70); padding: 24px;
  }
  .kartu { background: #fff; border-radius: 24px; box-shadow: 0 25px 60px rgba(0,0,0,.35);
    max-width: 460px; width: 100%; padding: 40px 32px; text-align: center; }
  .ikon { width: 56px; height: 56px; margin: 0 auto 18px; border-radius: 16px; background: #FEF3C7;
    display: flex; align-items: center; justify-content: center; font-size: 28px; }
  h1 { font-size: 19px; color: #1e293b; margin-bottom: 10px; }
  p { font-size: 13.5px; line-height: 1.7; color: #64748b; }
  .aksi { margin-top: 24px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  a.tombol { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 12px;
    font-size: 13px; font-weight: 600; text-decoration: none; transition: opacity .15s; }
  a.tombol:hover { opacity: .88; }
  .utama { background: #14655e; color: #fff; }
  .negasi { background: #f1f5f9; color: #334155; }
  .jenama { margin-top: 26px; font-size: 10.5px; color: #94a3b8; letter-spacing: .04em; }
</style>
</head>
<body>
  <div class="kartu">
    <div class="ikon">📄</div>
    <h1>${judul}</h1>
    <p>${pesan}</p>
    <div class="aksi">
      <a class="tombol negasi" href="javascript:history.back()">← Kembali</a>
      ${tombolMasuk ? '<a class="tombol utama" href="/login">Masuk ke Akun</a>' : '<a class="tombol utama" href="/">Halaman Utama</a>'}
    </div>
    <p class="jenama">E-REKOM · DINAS KESEHATAN KAB. KUTAI KARTANEGARA</p>
  </div>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
