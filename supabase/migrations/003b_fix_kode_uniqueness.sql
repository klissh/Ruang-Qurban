-- ============================================================
-- MIGRATION 003b: Perbaiki unique constraint kode_resi & kode_jamaah
-- agar scoped per workspace+periode (bukan global lagi)
-- ============================================================
-- Tanpa ini, periode baru 2026 tidak bisa re-pakai SAPI-A01
-- karena constraint lama melihat seluruh tabel secara global.
-- Jalankan SETELAH 003_periode_arsip.sql selesai dijalankan.
-- ============================================================

-- ------------------------------------------------------------
-- 1. kode_resi: dari UNIQUE global → UNIQUE per (id_workspace, periode_id)
-- ------------------------------------------------------------
ALTER TABLE hewan DROP CONSTRAINT IF EXISTS hewan_kode_resi_key;

-- Setiap workspace boleh punya SAPI-A01 di setiap periode berbeda
CREATE UNIQUE INDEX hewan_kode_resi_periode_unique
  ON hewan(id_workspace, periode_id, kode_resi);

-- ------------------------------------------------------------
-- 2. kode_jamaah: dari UNIQUE global → UNIQUE per periode
--    Tetap DEFERRABLE INITIALLY DEFERRED agar trigger swap tidak
--    bertabrakan di tengah transaksi
-- ------------------------------------------------------------
ALTER TABLE jamaah DROP CONSTRAINT IF EXISTS jamaah_kode_jamaah_unique;

ALTER TABLE jamaah
  ADD CONSTRAINT jamaah_kode_jamaah_periode_unique
  UNIQUE (periode_id, kode_jamaah)
  DEFERRABLE INITIALLY DEFERRED;

-- kode_publik (untuk tracking publik) tetap UNIQUE global — sudah random,
-- tidak mungkin collision antar periode, dan URL publik harus universal unik.
