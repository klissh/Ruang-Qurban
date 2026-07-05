-- ============================================================
-- MIGRATION 006: Tabel Kurir + Status GAGAL_DIANTAR
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Tabel kurir — daftar pengantar per workspace
CREATE TABLE IF NOT EXISTS kurir (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_workspace  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  nama          VARCHAR(255) NOT NULL,
  no_hp         VARCHAR(20),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_kurir_updated_at BEFORE UPDATE ON kurir
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_kurir_workspace ON kurir(id_workspace);

ALTER TABLE kurir ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kurir_workspace_isolation"
  ON kurir FOR ALL
  USING (id_workspace = get_my_workspace_id());

-- 2. Tambah GAGAL_DIANTAR ke status_antar enum
-- Hapus constraint lama, buat yang baru dengan nilai tambahan
ALTER TABLE jamaah DROP CONSTRAINT IF EXISTS jamaah_status_antar_check;
ALTER TABLE jamaah ADD CONSTRAINT jamaah_status_antar_check
  CHECK (status_antar IN (
    'BELUM_DIANTAR',
    'SEDANG_DIANTAR',
    'SUDAH_DIANTAR',
    'GAGAL_DIANTAR'
  ));
