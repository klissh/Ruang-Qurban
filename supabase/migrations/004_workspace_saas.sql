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

-- Sekarang enforce NOT NULL & UNIQUE
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
-- 3. RLS Policies baru untuk workspaces
-- ------------------------------------------------------------

-- User bisa lihat workspace mereka sendiri
CREATE POLICY IF NOT EXISTS "workspaces_select_own"
  ON workspaces FOR SELECT
  USING (id = get_my_workspace_id());

-- SUPER_ADMIN bisa update workspace mereka
CREATE POLICY IF NOT EXISTS "workspaces_update_super_admin"
  ON workspaces FOR UPDATE
  USING (
    id = get_my_workspace_id()
    AND get_my_role() = 'SUPER_ADMIN'
  );

-- ------------------------------------------------------------
-- 4. Tambah RLS baru untuk profiles
-- ------------------------------------------------------------

-- User bisa baca profil sendiri (meski belum assign workspace)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_select_own'
  ) THEN
    CREATE POLICY "profiles_select_own"
      ON profiles FOR SELECT
      USING (id = auth.uid());
  END IF;
END $$;

-- UPDATE policy sudah ada: profiles_update_own (id = auth.uid())

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
-- 6. RLS: profiles — SUPER_ADMIN bisa update role/workspace anggota
-- ------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_super_admin_manage'
  ) THEN
    CREATE POLICY "profiles_super_admin_manage"
      ON profiles FOR UPDATE
      USING (
        id_workspace = get_my_workspace_id()
        AND get_my_role() = 'SUPER_ADMIN'
      );
  END IF;
END $$;

-- ------------------------------------------------------------
-- 7. Catatan untuk operator:
--    Setelah menjalankan migration ini, set slug untuk workspace
--    yang ada via SQL Editor:
--      UPDATE workspaces SET slug = 'nama-masjid-anda' WHERE id = '<uuid>';
-- ------------------------------------------------------------
