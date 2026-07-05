import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code        = searchParams.get('code')
  const token_hash  = searchParams.get('token_hash')
  const type        = searchParams.get('type')
  const errorParam  = searchParams.get('error')

  if (errorParam) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const supabase = await createClient()

  if (token_hash && type) {
    // Email confirmation / magic link / password recovery (token_hash based)
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    })
    if (verifyError) {
      console.error('verifyOtp error:', verifyError.message)
      return NextResponse.redirect(`${origin}/login?error=verify_failed`)
    }

    // Recovery flow → halaman reset password
    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/reset-password`)
    }
  } else if (code) {
    // PKCE code exchange (OAuth / fallback)
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      console.error('exchangeCodeForSession error:', exchangeError.message)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }
  } else {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const serviceClient = createServiceClient()

  // Cek apakah profile sudah ada
  const { data: existingProfile } = await serviceClient
    .from('profiles')
    .select('id, id_workspace, workspaces(slug)')
    .eq('id', user.id)
    .single()

  if (existingProfile) {
    if (existingProfile.id_workspace) {
      const ws   = existingProfile.workspaces as any
      const slug = ws?.slug ?? 'default'
      return NextResponse.redirect(`${origin}/w/${slug}/analitik`)
    }
    return NextResponse.redirect(`${origin}/waiting`)
  }

  // Profile belum ada — buat baru berdasarkan metadata
  const meta       = user.user_metadata ?? {}
  const namaLengkap = meta.nama_lengkap || user.email || 'Pengguna Baru'

  if (meta.is_workspace_creator) {
    const { data: workspace, error: wsError } = await serviceClient
      .from('workspaces')
      .insert({
        nama:       meta.pending_workspace_name ?? 'Workspace Baru',
        slug:       meta.pending_workspace_slug ?? `ws-${Date.now()}`,
        created_by: user.id,
      })
      .select('id, slug')
      .single()

    if (wsError || !workspace) {
      console.error('Gagal buat workspace:', wsError)
      return NextResponse.redirect(`${origin}/login?error=workspace_failed`)
    }

    await serviceClient.from('profiles').insert({
      id:           user.id,
      id_workspace: workspace.id,
      nama_lengkap: namaLengkap,
      role:         'SUPER_ADMIN',
      email:        user.email,
    })

    return NextResponse.redirect(`${origin}/w/${workspace.slug}/analitik`)
  }

  // User biasa — buat profile tanpa workspace
  await serviceClient.from('profiles').insert({
    id:           user.id,
    id_workspace: null,
    nama_lengkap: namaLengkap,
    role:         'PETUGAS_LAPANGAN',
    email:        user.email,
  })

  return NextResponse.redirect(`${origin}/waiting`)
}
