-- ============================================================
-- MIGRATION 007: Keterangan Gagal Diantar
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Tambah kolom keterangan_gagal di tabel jamaah
ALTER TABLE jamaah ADD COLUMN IF NOT EXISTS keterangan_gagal TEXT NULL;

-- Update RLS tidak perlu — kolom baru otomatis ikut policy workspace_isolation
