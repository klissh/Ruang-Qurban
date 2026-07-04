'use client'

import { createContext, useContext } from 'react'
import type { Role } from '@/types'

export type PageAccess = 'full' | 'visitor' | 'none'

export interface WorkspacePermissions {
  analitik:          PageAccess
  data_hewan:        PageAccess
  status:            PageAccess
  pengantaran:       PageAccess
  log:               PageAccess
  arsip:             PageAccess
  manajemen_anggota: 'full' | 'none'
}

export const SUPER_ADMIN_PERMISSIONS: WorkspacePermissions = {
  analitik: 'full', data_hewan: 'full', status: 'full',
  pengantaran: 'full', log: 'full', arsip: 'full', manajemen_anggota: 'full',
}

export const NO_PERMISSIONS: WorkspacePermissions = {
  analitik: 'none', data_hewan: 'none', status: 'none',
  pengantaran: 'none', log: 'none', arsip: 'none', manajemen_anggota: 'none',
}

export interface WorkspaceContextValue {
  workspaceId:  string
  slug:         string
  namaWorkspace: string
  userId:       string
  namaUser:     string
  role:         Role
  permissions:  WorkspacePermissions
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: WorkspaceContextValue
}) {
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace harus dipakai di dalam WorkspaceProvider')
  return ctx
}
