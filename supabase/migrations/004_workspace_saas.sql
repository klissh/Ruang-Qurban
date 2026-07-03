-- ============================================================
-- MIGRATION 004: Multi-Tenant SaaS Workspace
-- ============================================================
-- Jalankan di Supabase SQL Editor setelah 003b selesai.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tambah slug & created_by ke workspaces
-- ------------------------------------------------------------
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS slug        TEXT,
  ADD COLUMN IF NOT EXISTS created_by  UUID REFERENCES auth.users(id);

-- Backfill slug untuk workspace yang sudah ada
UPDATE workspaces SET slug = 'default' WHERE slug IS NULL;

-- Enforce NOT NULL & UNIQUE
ALTER TABLE workspaces ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_slug_unique ON workspaces(slug);

-- ------------------------------------------------------------
-- 2. Tambah email ke profiles (untuk pencarian user oleh SUPER_ADMIN)
-- ------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill email dari auth.users untuk user yang sudah ada
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- ------------------------------------------------------------
-- 3. RLS Policies untuk workspaces
--    Gunakan DO block + DROP IF EXISTS agar idempotent
-- ------------------------------------------------------------
DO $$ BEGIN
  DROP POLICY IF EXISTS "workspaces_select_own"       ON workspaces;
  DROP POLICY IF EXISTS "workspaces_update_super_admin" ON workspaces;
END $$;

CREATE POLICY "workspaces_select_own"
  ON workspaces FOR SELECT
  USING (id = get_my_workspace_id());

CREATE POLICY "workspaces_update_super_admin"
  ON workspaces FOR UPDATE
  USING (
    id = get_my_workspace_id()
    AND get_my_role() = 'SUPER_ADMIN'
  );

-- ------------------------------------------------------------
-- 4. RLS tambahan untuk profiles
-- ------------------------------------------------------------
DO $$ BEGIN
  DROP POLICY IF EXISTS "profiles_select_own"         ON profiles;
  DROP POLICY IF EXISTS "profiles_super_admin_manage" ON profiles;
END $$;

-- User bisa baca profil sendiri (meski belum assign workspace)
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- SUPER_ADMIN bisa update role/workspace anggota di workspace yang sama
CREATE POLICY "profiles_super_admin_manage"
  ON profiles FOR UPDATE
  USING (
    id_workspace = get_my_workspace_id()
    AND get_my_role() = 'SUPER_ADMIN'
  );

-- ------------------------------------------------------------
-- 5. Helper functions tambahan
-- ------------------------------------------------------------

-- Ambil slug workspace untuk user yang sedang login
CREATE OR REPLACE FUNCTION get_my_workspace_slug()
RETURNS TEXT AS $$
  SELECT w.slug FROM workspaces w
  JOIN profiles p ON p.id_workspace = w.id
  WHERE p.id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------
-- Catatan:
-- Setelah migration ini, set slug yang tepat untuk workspace
-- yang sudah ada (jika masih 'default'):
--   UPDATE workspaces SET slug = 'nama-masjid-anda' WHERE slug = 'default';
-- ------------------------------------------------------------
