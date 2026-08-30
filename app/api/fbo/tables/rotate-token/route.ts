import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { signTableToken } from '@/lib/hmac'
import { getTenantBaseUrl } from '@/lib/constants'
import QRCode from 'qrcode'

export async function POST(req: NextRequest) {
  try {
    const { table_id } = await req.json()
    if (!table_id) return NextResponse.json({ error: 'Missing table_id' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} },
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: table } = await (supabase as any)
      .from('fbo_tables')
      .select('id, table_number, fbo_id')
      .eq('id', table_id)
      .single()

    if (!table) return NextResponse.json({ error: 'Table not found' }, { status: 404 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fbo } = await (supabase as any)
      .from('fbos')
      .select('id, profile_id, token_signing_salt, slug')
      .eq('id', table.fbo_id)
      .single()

    if (!fbo || fbo.profile_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tokenPayload = {
      fbo_id: fbo.id,
      table_id: table.id,
      table_number: table.table_number,
      issued_at: Date.now(),
    }

    const newToken = await signTableToken(tokenPayload, fbo.token_signing_salt || 'default_salt')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('fbo_tables')
      .update({ signed_token: newToken, token_issued_at: new Date().toISOString() })
      .eq('id', table.id)

    const hostHeader = req.headers.get('host')
    const tenantBaseUrl = getTenantBaseUrl(fbo.slug || 'outlet', hostHeader)
    const joiner = tenantBaseUrl.includes('?') ? '&' : '?'
    const qrUrl = `${tenantBaseUrl}${joiner}t=${encodeURIComponent(newToken)}`
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 300, margin: 2 })

    return NextResponse.json({ success: true, token: newToken, qr_url: qrDataUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
