import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { generateTenantSalt } from '@/lib/hmac'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fboId } = await params
    const body = await req.json()
    const { enabled, slug } = body

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} },
    })

    // Verify caller is admin / super_admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 })
    }

    // Fetch existing FBO record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fbo, error: fetchErr } = await (supabase as any)
      .from('fbos')
      .select('id, business_name, slug, token_signing_salt')
      .eq('id', fboId)
      .single()

    if (fetchErr || !fbo) {
      return NextResponse.json({ error: 'FBO not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {
      qr_enabled_by_admin: !!enabled,
    }

    // If enabling and no slug exists, generate one from business_name or provided slug
    if (enabled) {
      let finalSlug = slug || fbo.slug
      if (!finalSlug) {
        finalSlug = fbo.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      }
      updates.slug = finalSlug

      if (!fbo.token_signing_salt) {
        updates.token_signing_salt = generateTenantSalt()
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedFbo, error: updateErr } = await (supabase as any)
      .from('fbos')
      .update(updates)
      .eq('id', fboId)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, fbo: updatedFbo })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
