-- ============================================================
-- MIGRATION 002: Monitoring Pengantaran + Perluasan Status Hewan
-- ============================================================
-- Jalankan file ini di Supabase SQL Editor (production project).
-- Aman dijalankan sekali; backfill data lama sudah termasuk di dalamnya.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Perluas status hewan: 4 tahap -> 8 tahap
-- ------------------------------------------------------------
ALTER TABLE hewan DROP CONSTRAINT hewan_status_check;

-- Migrasi data lama ke status baru yang paling sesuai
UPDATE hewan SET status = 'MENUNGGU_SEMBELIH' WHERE status = 'BELUM_DISEMBELIH';
-- SEDANG_DISEMBELIH, PENCACAHAN, SELESAI: key-nya tetap sama, tidak perlu diubah

ALTER TABLE hewan ADD CONSTRAINT hewan_status_check
  CHECK (status IN (
    'TERDAFTAR', 'SAMPAI_MASJID', 'MENUNGGU_SEMBELIH', 'SEDANG_DISEMBELIH',
    'SUDAH_DISEMBELIH', 'PENCACAHAN', 'PACKING', 'SELESAI'
  ));

ALTER TABLE hewan ALTER COLUMN status SET DEFAULT 'TERDAFTAR';

-- ------------------------------------------------------------
-- 2. Tambah kolom pengantaran + kode_jamaah individual di jamaah
-- ------------------------------------------------------------
ALTER TABLE jamaah
  ADD COLUMN kode_jamaah   VARCHAR(30),
  ADD COLUMN status_antar  VARCHAR(20) NOT NULL DEFAULT 'BELUM_DIANTAR'
              CHECK (status_antar IN ('BELUM_DIANTAR', 'SEDANG_DIANTAR', 'SUDAH_DIANTAR')),
  ADD COLUMN waktu_antar   TIMESTAMPTZ,
  ADD COLUMN diantar_oleh  VARCHAR(255);

-- Unique DEFERRABLE supaya recompute (swap/transfer) tidak bentrok constraint
-- di tengah transaksi yang sama
ALTER TABLE jamaah
  ADD CONSTRAINT jamaah_kode_jamaah_unique UNIQUE (kode_jamaah)
  DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX idx_jamaah_status_antar ON jamaah(status_antar);
CREATE INDEX idx_jamaah_kode_jamaah  ON jamaah(kode_jamaah);

-- ------------------------------------------------------------
-- 3. Auto-generate kode_jamaah (kode resi per-orang)
--    SAPI    -> kode_resi hewan + "-" + urutan (1..7, berdasar created_at)
--    KAMBING -> sama dengan kode_resi hewan (sudah 1:1 per orang)
--    Otomatis ter-update saat: jamaah baru, pindah hewan, tukar hewan,
--    atau soft-delete/restore — tidak perlu ubah kode di API manapun.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION recompute_kode_jamaah(p_id_hewan UUID)
RETURNS VOID AS $$
DECLARE
  v_kode_resi TEXT;
  v_jenis     TEXT;
BEGIN
  IF p_id_hewan IS NULL THEN RETURN; END IF;

  SELECT kode_resi, jenis_hewan INTO v_kode_resi, v_jenis
    FROM hewan WHERE id = p_id_hewan;

  IF v_kode_resi IS NULL THEN RETURN; END IF;

  IF v_jenis = 'KAMBING' THEN
    UPDATE jamaah SET kode_jamaah = v_kode_resi
      WHERE id_hewan = p_id_hewan AND deleted_at IS NULL;
  ELSE
    WITH ordered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
      FROM jamaah
      WHERE id_hewan = p_id_hewan AND deleted_at IS NULL
    )
    UPDATE jamaah j SET kode_jamaah = v_kode_resi || '-' || ordered.rn
    FROM ordered
    WHERE j.id = ordered.id;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_jamaah_kode_jamaah()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM recompute_kode_jamaah(NEW.id_hewan);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.id_hewan IS DISTINCT FROM OLD.id_hewan THEN
      PERFORM recompute_kode_jamaah(OLD.id_hewan);
      PERFORM recompute_kode_jamaah(NEW.id_hewan);
    ELSIF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
      PERFORM recompute_kode_jamaah(NEW.id_hewan);
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_jamaah_kode_jamaah_aiu
AFTER INSERT OR UPDATE ON jamaah
FOR EACH ROW EXECUTE FUNCTION trg_jamaah_kode_jamaah();

-- Backfill kode_jamaah untuk data yang sudah ada
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT id_hewan FROM jamaah WHERE deleted_at IS NULL AND id_hewan IS NOT NULL LOOP
    PERFORM recompute_kode_jamaah(r.id_hewan);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 4. Index tambahan buat query halaman Pengantaran
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_hewan_status_selesai ON hewan(status) WHERE status = 'SELESAI';
