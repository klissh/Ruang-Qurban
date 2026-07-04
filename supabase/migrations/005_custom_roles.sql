-- ============================================================
-- MIGRATION 005: Custom Role System
-- ============================================================

-- 1. Tabel workspace_roles
CREATE TABLE IF NOT EXISTS workspace_roles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  nama          text NOT NULL,
  permissions   jsonb NOT NULL DEFAULT '{}',
  is_super_admin boolean DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(workspace_id, nama)
);

ALTER TABLE workspace_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roles_select_workspace"     ON workspace_roles;
DROP POLICY IF EXISTS "roles_manage_super_admin"   ON workspace_roles;

CREATE POLICY "roles_select_workspace"
  ON workspace_roles FOR SELECT
  USING (workspace_id = get_my_workspace_id());

CREATE POLICY "roles_manage_super_admin"
  ON workspace_roles FOR ALL
  USING (workspace_id = get_my_workspace_id() AND get_my_role() = 'SUPER_ADMIN');

-- 2. Tambah workspace_role_id ke profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS workspace_role_id uuid REFERENCES workspace_roles(id) ON DELETE SET NULL;

-- 3. Seed role "Super Admin" untuk workspace yang sudah ada
INSERT INTO workspace_roles (workspace_id, nama, permissions, is_super_admin)
SELECT id,
  'Super Admin',
  '{
    "analitik":           "full",
    "data_hewan":         "full",
    "status":             "full",
    "pengantaran":        "full",
    "log":                "full",
    "arsip":              "full",
    "manajemen_anggota":  "full"
  }'::jsonb,
  true
FROM workspaces
ON CONFLICT (workspace_id, nama) DO NOTHING;

-- 4. Assign SUPER_ADMIN profiles ke role Super Admin
UPDATE profiles p
SET workspace_role_id = wr.id
FROM workspace_roles wr
WHERE wr.workspace_id = p.id_workspace
  AND wr.is_super_admin = true
  AND p.role = 'SUPER_ADMIN'
  AND p.workspace_role_id IS NULL;
