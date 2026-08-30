import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { signTableToken, generateTenantSalt } from '@/lib/hmac'
import { getTenantBaseUrl } from '@/lib/constants'
import QRCode from 'qrcode'

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} },
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: fbo } = await (supabase as any)
      .from('fbos')
      .select('id, slug, token_signing_salt')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (!fbo) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: fboById } = await (supabase as any)
        .from('fbos')
        .select('id, slug, token_signing_salt')
        .eq('id', user.id)
        .maybeSingle()
      fbo = fboById
    }

    if (!fbo) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: firstFbo } = await (supabase as any)
        .from('fbos')
        .select('id, slug, token_signing_salt')
        .limit(1)
        .maybeSingle()
      fbo = firstFbo
    }

    if (!fbo) return NextResponse.json({ error: 'FBO profile not found' }, { status: 404 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tables } = await (supabase as any)
      .from('fbo_tables')
      .select('*')
      .eq('fbo_id', fbo.id)
      .order('table_number', { ascending: true })

    const hostHeader = req.headers.get('host')
    const tenantBaseUrl = getTenantBaseUrl(fbo.slug || 'outlet', hostHeader)

    // Attach QR Data URLs
    const tablesWithQr = await Promise.all(
      (tables || []).map(async (tbl: { id: string; table_number: string; signed_token: string }) => {
        const joiner = tenantBaseUrl.includes('?') ? '&' : '?'
        const qrUrl = `${tenantBaseUrl}${joiner}t=${encodeURIComponent(tbl.signed_token)}`
        const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 300, margin: 2 })
        return { ...tbl, qr_url: qrDataUrl, full_url: qrUrl }
      })
    )

    // Also counter QR
    const counterToken = await signTableToken(
      { fbo_id: fbo.id, table_id: 'counter', table_number: 'counter', issued_at: Date.now() },
      fbo.token_signing_salt || 'default_salt'
    )
    const joiner = tenantBaseUrl.includes('?') ? '&' : '?'
    const counterUrl = `${tenantBaseUrl}${joiner}type=counter&ct=${encodeURIComponent(counterToken)}`
    const counterQrData = await QRCode.toDataURL(counterUrl, { width: 300, margin: 2 })

    return NextResponse.json({
      tables: tablesWithQr,
      counter_qr: { qr_url: counterQrData, full_url: counterUrl, token: counterToken },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { table_count } = await req.json()
    const count = Number(table_count) || 0
    if (count <= 0) return NextResponse.json({ error: 'Invalid table count' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} },
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: fbo } = await (supabase as any)
      .from('fbos')
      .select('id, slug, token_signing_salt')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (!fbo) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: fboById } = await (supabase as any)
        .from('fbos')
        .select('id, slug, token_signing_salt')
        .eq('id', user.id)
        .maybeSingle()
      fbo = fboById
    }

    if (!fbo) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: firstFbo } = await (supabase as any)
        .from('fbos')
        .select('id, slug, token_signing_salt')
        .limit(1)
        .maybeSingle()
      fbo = firstFbo
    }

    if (!fbo) return NextResponse.json({ error: 'FBO profile not found' }, { status: 404 })

    let salt = fbo.token_signing_salt
    if (!salt) {
      salt = generateTenantSalt()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('fbos').update({ token_signing_salt: salt }).eq('id', fbo.id)
    }

    const insertedTables = []
    for (let i = 1; i <= count; i++) {
      const tableNum = String(i)
      // Placeholder insert first to get ID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tableRow } = await (supabase as any)
        .from('fbo_tables')
        .upsert(
          { fbo_id: fbo.id, table_number: tableNum, signed_token: `placeholder_${Date.now()}_${i}` },
          { onConflict: 'fbo_id,table_number' }
        )
        .select()
        .single()

      if (!tableRow) continue

      const tokenPayload = {
        fbo_id: fbo.id,
        table_id: tableRow.id,
        table_number: tableNum,
        issued_at: Date.now(),
      }
      const signedToken = await signTableToken(tokenPayload, salt)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('fbo_tables')
        .update({ signed_token: signedToken })
        .eq('id', tableRow.id)

      insertedTables.push({ ...tableRow, signed_token: signedToken })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('fbos').update({ table_count: count }).eq('id', fbo.id)

    return NextResponse.json({ success: true, count: insertedTables.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
