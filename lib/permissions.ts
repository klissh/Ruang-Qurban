import type { WorkspacePermissions } from '@/context/WorkspaceContext'
import { SUPER_ADMIN_PERMISSIONS, NO_PERMISSIONS } from '@/context/WorkspaceContext'

export function resolvePermissions(
  role: string,
  workspaceRolePerms: Record<string, string> | null | undefined
): WorkspacePermissions {
  if (role === 'SUPER_ADMIN') return SUPER_ADMIN_PERMISSIONS
  if (!workspaceRolePerms) return NO_PERMISSIONS

  return {
    analitik:          (workspaceRolePerms.analitik          ?? 'none') as any,
    data_hewan:        (workspaceRolePerms.data_hewan        ?? 'none') as any,
    status:            (workspaceRolePerms.status            ?? 'none') as any,
    pengantaran:       (workspaceRolePerms.pengantaran       ?? 'none') as any,
    log:               (workspaceRolePerms.log               ?? 'none') as any,
    arsip:             (workspaceRolePerms.arsip             ?? 'none') as any,
    manajemen_anggota: (workspaceRolePerms.manajemen_anggota ?? 'none') as any,
  }
}
