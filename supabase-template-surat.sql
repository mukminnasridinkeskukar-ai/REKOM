-- ============================================================================
-- E-REKOM — SETUP TEMPLATE SURAT PER JENIS (jalankan SEKALI di Supabase SQL Editor)
-- Menambah kolom template_surat pada master_jenis_rekom.
-- ============================================================================

alter table public.master_jenis_rekom
  add column if not exists template_surat text;

-- Selesai. Setelah ini admin bisa membuka:
-- Admin -> Jenis Rekomendasi -> Edit -> tab "Template Surat"
-- dan menyesuaikan format surat mengikuti template resmi Dinkes,
-- termasuk tombol "Pratinjau Surat" untuk melihat PDF contohnya.
