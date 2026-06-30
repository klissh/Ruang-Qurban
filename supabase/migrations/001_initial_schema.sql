-- ============================================================
-- PORTAL TRACKING QURBAN - Database Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: workspaces
-- Menyimpan data kepanitiaan/masjid
-- ============================================================
CREATE TABLE workspaces (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama          VARCHAR(255) NOT NULL,
  logo_url      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

-- ============================================================
-- TABLE: profiles
-- Ekstensi dari auth.users milik Supabase Auth
-- ============================================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  id_workspace  UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  nama_lengkap  VARCHAR(255) NOT NULL,
  role          VARCHAR(30) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN_PENDAFTARAN', 'PETUGAS_LAPANGAN')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: hewan
-- Entitas hewan qurban — poros sistem tracking
-- ============================================================
CREATE TABLE hewan (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_workspace    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  kode_resi       VARCHAR(20) NOT NULL UNIQUE,   -- SAPI-A01 (untuk panitia & petugas)
  kode_publik     VARCHAR(20) NOT NULL UNIQUE,   -- X7KQ-2M9R (untuk portal publik jamaah)
  jenis_hewan     VARCHAR(10) NOT NULL CHECK (jenis_hewan IN ('SAPI', 'KAMBING')),
  status          VARCHAR(30) NOT NULL DEFAULT 'BELUM_DISEMBELIH'
                  CHECK (status IN ('BELUM_DISEMBELIH', 'SEDANG_DISEMBELIH', 'PENCACAHAN', 'SELESAI')),
  url_dokumentasi TEXT,                          -- Google Drive preview link
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

-- ============================================================
-- TABLE: jamaah
-- Data individu pengqurban
-- ============================================================
CREATE TABLE jamaah (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_workspace  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  id_hewan      UUID REFERENCES hewan(id) ON DELETE SET NULL,
  nama_lengkap  VARCHAR(255) NOT NULL,
  atas_nama     VARCHAR(255),                    -- nama keluarga jika mewakili (opsional)
  no_hp         VARCHAR(20),
  alamat_lengkap TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

-- ============================================================
-- TABLE: status_log
-- Audit trail setiap perubahan status hewan
-- ============================================================
CREATE TABLE status_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_hewan      UUID NOT NULL REFERENCES hewan(id) ON DELETE CASCADE,
  id_user       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  nama_user     VARCHAR(255),                    -- disimpan snapshot agar tidak hilang jika user dihapus
  status_lama   VARCHAR(30),
  status_baru   VARCHAR(30) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES — untuk performa query yang sering dipakai
-- ============================================================
CREATE INDEX idx_hewan_workspace     ON hewan(id_workspace);
CREATE INDEX idx_hewan_kode_publik   ON hewan(kode_publik);     -- public tracking search
CREATE INDEX idx_hewan_status        ON hewan(status);
CREATE INDEX idx_jamaah_workspace    ON jamaah(id_workspace);
CREATE INDEX idx_jamaah_hewan        ON jamaah(id_hewan);
CREATE INDEX idx_status_log_hewan    ON status_log(id_hewan);
CREATE INDEX idx_profiles_workspace  ON profiles(id_workspace);

-- ============================================================
-- FUNCTION: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_hewan_updated_at BEFORE UPDATE ON hewan
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_jamaah_updated_at BEFORE UPDATE ON jamaah
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTION: generate kode_publik acak (format: XXXX-XXXX)
-- ============================================================
CREATE OR REPLACE FUNCTION generate_kode_publik()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- hapus karakter ambigu (0,O,I,1)
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  result := result || '-';
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: auto-generate kode_publik unik sebelum INSERT hewan
-- ============================================================
CREATE OR REPLACE FUNCTION set_kode_publik()
RETURNS TRIGGER AS $$
DECLARE
  new_kode TEXT;
  attempts INT := 0;
BEGIN
  IF NEW.kode_publik IS NULL OR NEW.kode_publik = '' THEN
    LOOP
      new_kode := generate_kode_publik();
      IF NOT EXISTS (SELECT 1 FROM hewan WHERE kode_publik = new_kode) THEN
        NEW.kode_publik := new_kode;
        EXIT;
      END IF;
      attempts := attempts + 1;
      IF attempts > 10 THEN
        RAISE EXCEPTION 'Gagal generate kode_publik unik setelah 10 percobaan';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hewan_kode_publik BEFORE INSERT ON hewan
  FOR EACH ROW EXECUTE FUNCTION set_kode_publik();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE workspaces  ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE hewan       ENABLE ROW LEVEL SECURITY;
ALTER TABLE jamaah      ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_log  ENABLE ROW LEVEL SECURITY;

-- Helper function: ambil workspace dari user yang sedang login
CREATE OR REPLACE FUNCTION get_my_workspace_id()
RETURNS UUID AS $$
  SELECT id_workspace FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function: ambil role dari user yang sedang login
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles: user hanya bisa lihat sesama workspace
CREATE POLICY "profiles_select_own_workspace"
  ON profiles FOR SELECT
  USING (id_workspace = get_my_workspace_id());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Hewan: hanya bisa akses hewan dari workspace sendiri
CREATE POLICY "hewan_workspace_isolation"
  ON hewan FOR ALL
  USING (id_workspace = get_my_workspace_id());

-- Hewan publik: siapa pun bisa SELECT berdasarkan kode_publik (untuk tracking)
CREATE POLICY "hewan_public_tracking"
  ON hewan FOR SELECT
  USING (true);  -- di-filter di API level dengan rate limiting

-- Jamaah: hanya bisa akses jamaah dari workspace sendiri
CREATE POLICY "jamaah_workspace_isolation"
  ON jamaah FOR ALL
  USING (id_workspace = get_my_workspace_id());

-- Status log: hanya bisa lihat log dari hewan di workspace sendiri
CREATE POLICY "status_log_workspace_isolation"
  ON status_log FOR SELECT
  USING (
    id_hewan IN (SELECT id FROM hewan WHERE id_workspace = get_my_workspace_id())
  );

CREATE POLICY "status_log_insert"
  ON status_log FOR INSERT
  WITH CHECK (
    id_hewan IN (SELECT id FROM hewan WHERE id_workspace = get_my_workspace_id())
  );
