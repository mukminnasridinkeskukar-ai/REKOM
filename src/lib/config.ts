// E-REKOM — konfigurasi mode (Supabase produksi vs demo lokal)

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** true ketika env Supabase sudah diisi -> aplikasi memakai Supabase sungguhan */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export const APP_NAME = "E-REKOM";
export const APP_LONG_NAME =
  "Tata Kelola Rekomendasi Kepala Dinas Kesehatan Kabupaten Kutai Kartanegara";
export const INSTANSI = "Dinas Kesehatan Kabupaten Kutai Kartanegara";
export const ALAMAT_INSTANSI =
  "Jalan Gajah Mada No. 9 Tenggarong, Kutai Kartanegara, Kalimantan Timur 75512";
export const TAHUN = new Date().getFullYear();
