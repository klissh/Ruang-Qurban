-- ============================================================
-- MIGRATION 003: Sistem Periode & Arsip Tahunan
-- ============================================================
-- Jalankan file ini di Supabase SQL Editor (production project).
-- Aman dijalankan sekali; backfill data lama sudah termasuk di dalamnya.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABLE: periode_qurban
--    Satu baris = satu tahun pelaksanaan qurban di satu workspace
-- ------------------------------------------------------------
CREATE TABLE periode_qurban (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_workspace          UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tahun                 INT NOT NULL,
  nama_event            VARCHAR(255),                 -- misal "Qurban 1447H"
  tanggal_penyembelihan DATE,
  status                VARCHAR(10) NOT NULL DEFAULT 'aktif'
                         CHECK (status IN ('aktif', 'arsip')),
  diarsipkan_oleh       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  diarsipkan_pada       TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id_workspace, tahun)
);

CREATE TRIGGER trg_periode_qurban_updated_at BEFORE UPDATE ON periode_qurban
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Hanya boleh ada SATU periode berstatus 'aktif' per workspace di waktu yang sama
CREATE UNIQUE INDEX idx_periode_satu_aktif_per_workspace
  ON periode_qurban(id_workspace)
  WHERE status = 'aktif';

CREATE INDEX idx_periode_workspace ON periode_qurban(id_workspace);
CREATE INDEX idx_periode_status    ON periode_qurban(status);

-- ------------------------------------------------------------
-- 2. Tambah periode_id ke hewan & jamaah
-- ------------------------------------------------------------
ALTER TABLE hewan  ADD COLUMN periode_id UUID REFERENCES periode_qurban(id) ON DELETE RESTRICT;
ALTER TABLE jamaah ADD COLUMN periode_id UUID REFERENCES periode_qurban(id) ON DELETE RESTRICT;

CREATE INDEX idx_hewan_periode  ON hewan(periode_id);
CREATE INDEX idx_jamaah_periode ON jamaah(periode_id);

-- ------------------------------------------------------------
-- 3. Backfill: buat 1 periode 'aktif' per workspace yang sudah
--    punya data, lalu tempelkan periode_id itu ke semua hewan/jamaah
--    existing (termasuk yang soft-deleted, biar tidak ada baris yatim)
-- ------------------------------------------------------------
DO $$
DECLARE
  ws RECORD;
  new_periode_id UUID;
  tahun_default INT := EXTRACT(YEAR FROM NOW())::INT;
BEGIN
  FOR ws IN SELECT DISTINCT id_workspace FROM hewan LOOP
    INSERT INTO periode_qurban (id_workspace, tahun, nama_event, status)
    VALUES (ws.id_workspace, tahun_default, 'Qurban ' || tahun_default, 'aktif')
    ON CONFLICT (id_workspace, tahun) DO NOTHING
    RETURNING id INTO new_periode_id;

    IF new_periode_id IS NULL THEN
      SELECT id INTO new_periode_id FROM periode_qurban
        WHERE id_workspace = ws.id_workspace AND tahun = tahun_default;
    END IF;

    UPDATE hewan  SET periode_id = new_periode_id WHERE id_workspace = ws.id_workspace AND periode_id IS NULL;
    UPDATE jamaah SET periode_id = new_periode_id WHERE id_workspace = ws.id_workspace AND periode_id IS NULL;
  END LOOP;
END $$;

-- Mulai sekarang periode_id wajib diisi untuk baris baru
ALTER TABLE hewan  ALTER COLUMN periode_id SET NOT NULL;
ALTER TABLE jamaah ALTER COLUMN periode_id SET NOT NULL;

-- ------------------------------------------------------------
-- 4. Helper functions
-- ------------------------------------------------------------

-- Ambil id periode yang sedang 'aktif' di workspace user yang login
CREATE OR REPLACE FUNCTION get_active_periode_id()
RETURNS UUID AS $$
  SELECT id FROM periode_qurban
  WHERE id_workspace = get_my_workspace_id() AND status = 'aktif'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Cek apakah sebuah periode_id tertentu masih berstatus 'aktif'
CREATE OR REPLACE FUNCTION is_periode_aktif(p_periode_id UUID)
RETURNS BOOLEAN AS $$
  SELECT status = 'aktif' FROM periode_qurban WHERE id = p_periode_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------
-- 5. RLS: periode_qurban
-- ------------------------------------------------------------
ALTER TABLE periode_qurban ENABLE ROW LEVEL SECURITY;

CREATE POLICY "periode_select_own_workspace"
  ON periode_qurban FOR SELECT
  USING (id_workspace = get_my_workspace_id());

-- Hanya SUPER_ADMIN yang boleh buat/ubah periode (buka periode baru, arsip, buka-arsip-lagi)
CREATE POLICY "periode_write_super_admin"
  ON periode_qurban FOR INSERT
  WITH CHECK (id_workspace = get_my_workspace_id() AND get_my_role() = 'SUPER_ADMIN');

CREATE POLICY "periode_update_super_admin"
  ON periode_qurban FOR UPDATE
  USING (id_workspace = get_my_workspace_id() AND get_my_role() = 'SUPER_ADMIN');

-- ------------------------------------------------------------
-- 6. RLS: kunci tulis (INSERT/UPDATE/DELETE) ke hewan & jamaah
--    kalau periode-nya sudah 'arsip'. SELECT tetap terbuka penuh
--    (arsip harus tetap bisa dibaca).
-- ------------------------------------------------------------

-- Ganti policy lama "hewan_workspace_isolation" (FOR ALL) jadi granular per aksi
DROP POLICY IF EXISTS "hewan_workspace_isolation" ON hewan;

CREATE POLICY "hewan_select_own_workspace"
  ON hewan FOR SELECT
  USING (id_workspace = get_my_workspace_id());

CREATE POLICY "hewan_insert_periode_aktif"
  ON hewan FOR INSERT
  WITH CHECK (id_workspace = get_my_workspace_id() AND is_periode_aktif(periode_id));

CREATE POLICY "hewan_update_periode_aktif"
  ON hewan FOR UPDATE
  USING (id_workspace = get_my_workspace_id() AND is_periode_aktif(periode_id));

CREATE POLICY "hewan_delete_periode_aktif"
  ON hewan FOR DELETE
  USING (id_workspace = get_my_workspace_id() AND is_periode_aktif(periode_id));

-- Sama untuk jamaah
DROP POLICY IF EXISTS "jamaah_workspace_isolation" ON jamaah;

CREATE POLICY "jamaah_select_own_workspace"
  ON jamaah FOR SELECT
  USING (id_workspace = get_my_workspace_id());

CREATE POLICY "jamaah_insert_periode_aktif"
  ON jamaah FOR INSERT
  WITH CHECK (id_workspace = get_my_workspace_id() AND is_periode_aktif(periode_id));

CREATE POLICY "jamaah_update_periode_aktif"
  ON jamaah FOR UPDATE
  USING (id_workspace = get_my_workspace_id() AND is_periode_aktif(periode_id));

CREATE POLICY "jamaah_delete_periode_aktif"
  ON jamaah FOR DELETE
  USING (id_workspace = get_my_workspace_id() AND is_periode_aktif(periode_id));

-- ------------------------------------------------------------
-- 7. Function: tutup & arsipkan periode aktif workspace user
--    (dipanggil dari API route, bukan langsung dari client)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION arsipkan_periode_aktif()
RETURNS UUID AS $$
DECLARE
  v_periode_id UUID;
BEGIN
  IF get_my_role() != 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'Hanya SUPER_ADMIN yang boleh mengarsipkan periode';
  END IF;

  SELECT id INTO v_periode_id FROM periode_qurban
    WHERE id_workspace = get_my_workspace_id() AND status = 'aktif';

  IF v_periode_id IS NULL THEN
    RAISE EXCEPTION 'Tidak ada periode aktif untuk diarsipkan';
  END IF;

  UPDATE periode_qurban
    SET status = 'arsip', diarsipkan_oleh = auth.uid(), diarsipkan_pada = NOW()
    WHERE id = v_periode_id;

  RETURN v_periode_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- 8. Function: buka kembali arsip (unarchive) — emergency override
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION buka_kembali_arsip(p_periode_id UUID)
RETURNS VOID AS $$
BEGIN
  IF get_my_role() != 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'Hanya SUPER_ADMIN yang boleh membuka kembali arsip';
  END IF;

  IF EXISTS (
    SELECT 1 FROM periode_qurban
    WHERE id_workspace = get_my_workspace_id() AND status = 'aktif' AND id != p_periode_id
  ) THEN
    RAISE EXCEPTION 'Sudah ada periode aktif lain — arsipkan dulu periode itu sebelum membuka periode ini';
  END IF;

  UPDATE periode_qurban
    SET status = 'aktif', diarsipkan_oleh = NULL, diarsipkan_pada = NULL
    WHERE id = p_periode_id AND id_workspace = get_my_workspace_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- 9. Function: buat periode baru (SUPER_ADMIN)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION buat_periode_baru(p_tahun INT, p_nama_event TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
BEGIN
  IF get_my_role() != 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'Hanya SUPER_ADMIN yang boleh membuat periode baru';
  END IF;

  IF EXISTS (
    SELECT 1 FROM periode_qurban
    WHERE id_workspace = get_my_workspace_id() AND status = 'aktif'
  ) THEN
    RAISE EXCEPTION 'Masih ada periode aktif — arsipkan dulu sebelum membuat periode baru';
  END IF;

  INSERT INTO periode_qurban (id_workspace, tahun, nama_event, status)
  VALUES (get_my_workspace_id(), p_tahun, COALESCE(p_nama_event, 'Qurban ' || p_tahun), 'aktif')
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
