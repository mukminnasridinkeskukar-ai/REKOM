/**
 * Utilitas NIK & No. HP — aturan "1 pemohon = 1 akun berdasarkan NIK".
 * Dipakai bersama oleh route registrasi, cek NIK, lupa akun, dan profil.
 */

/** Ambil digit saja (buang spasi, tanda hubung, dsb.). */
export function normalisasiNik(input: string | null | undefined): string {
  return String(input ?? "").replace(/\D/g, "");
}

/** NIK Indonesia = tepat 16 digit angka. */
export function isNikValid(input: string | null | undefined): boolean {
  return normalisasiNik(input).length === 16;
}

/** Digit saja untuk nomor HP. */
export function normalisasiHp(input: string | null | undefined): string {
  return String(input ?? "").replace(/\D/g, "");
}

/**
 * Cocokkan dua nomor HP dengan toleransi awalan 0 / 62 dan tanda hubung:
 * bandingkan 10 digit terakhir, keduanya minimal 9 digit.
 */
export function hpCocok(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = normalisasiHp(a);
  const db_ = normalisasiHp(b);
  if (da.length < 9 || db_.length < 9) return false;
  return da.slice(-10) === db_.slice(-10);
}

/** Samarkan email: "andi@gmail.com" -> "a***@gmail.com" */
export function maskEmail(email: string | null | undefined): string {
  const e = String(email ?? "").trim();
  if (!e) return "-";
  const at = e.indexOf("@");
  if (at < 1) return "***";
  return `${e.slice(0, 1)}***${e.slice(at)}`;
}

/** Samarkan nama: "Andi Dea Amanda" -> "A*** D** A*****" */
export function maskNama(nama: string | null | undefined): string {
  const n = String(nama ?? "").trim();
  if (!n) return "-";
  return n
    .split(/\s+/)
    .map((w) => (w.length > 1 ? `${w[0]}${"*".repeat(Math.min(w.length - 1, 5))}` : w))
    .join(" ");
}
