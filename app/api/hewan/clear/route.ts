import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/hewan/clear
 * Hapus SEMUA data hewan + jamaah dalam workspace (termasuk soft-deleted).
 * Hanya boleh dilakukan oleh SUPER_ADMIN.
 */
export async function DELETE() {
  const supabase = await createClient()

  // ── Auth ────────────────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id_workspace')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Hanya SUPER_ADMIN yang bisa menghapus semua data' },
      { status: 403 }
    )
  }

  const workspaceId = profile.id_workspace!

  // ── Ambil SEMUA ID hewan dalam workspace (termasuk soft-deleted) ─────────
  // Tidak pakai filter deleted_at agar tidak ada record yatim yang lolos.
  const { data: hewanList, error: fetchErr } = await supabase
    .from('hewan')
    .select('id')
    .eq('id_workspace', workspaceId)

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  const hewanIds = (hewanList ?? []).map((h) => h.id)

  if (hewanIds.length === 0) {
    return NextResponse.json({ deleted: 0, jamaahDeleted: 0 })
  }

  // ── Hapus jamaah terlebih dahulu ─────────────────────────────────────────
  const { count: jamaahDeleted, error: jamaahErr } = await supabase
    .from('jamaah')
    .delete({ count: 'exact' })
    .in('id_hewan', hewanIds)

  if (jamaahErr) {
    return NextResponse.json({ error: `Gagal hapus jamaah: ${jamaahErr.message}` }, { status: 500 })
  }

  // ── Hapus SEMUA hewan (tanpa filter deleted_at) ──────────────────────────
  const { count: hewanDeleted, error: hewanErr } = await supabase
    .from('hewan')
    .delete({ count: 'exact' })
    .eq('id_workspace', workspaceId)

  if (hewanErr) {
    return NextResponse.json({ error: `Gagal hapus hewan: ${hewanErr.message}` }, { status: 500 })
  }

  return NextResponse.json({
    deleted:       hewanDeleted  ?? hewanIds.length,
    jamaahDeleted: jamaahDeleted ?? 0,
  })
}
