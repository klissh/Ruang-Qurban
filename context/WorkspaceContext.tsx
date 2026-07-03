'use client'

import { createContext, useContext } from 'react'
import type { Role } from '@/types'

export interface WorkspaceContextValue {
  workspaceId: string
  slug: string
  namaWorkspace: string
  userId: string
  namaUser: string
  role: Role
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
