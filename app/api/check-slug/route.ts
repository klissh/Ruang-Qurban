import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.trim().toLowerCase()
  if (!slug) return NextResponse.json({ available: false })
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  return NextResponse.json({ available: !data })
}
