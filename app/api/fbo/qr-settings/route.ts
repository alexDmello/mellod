import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} },
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch caller's FBO record by profile_id or id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: fbo } = await (supabase as any)
      .from('fbos')
      .select('*')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (!fbo) {
      // Fallback search by id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: fboById } = await (supabase as any)
        .from('fbos')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      fbo = fboById
    }

    if (!fbo) {
      // Fallback search first row for demo / development if single FBO
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: firstFbo } = await (supabase as any)
        .from('fbos')
        .select('*')
        .limit(1)
        .maybeSingle()

      fbo = firstFbo
    }

    if (!fbo) {
      return NextResponse.json({ error: 'FBO profile not found' }, { status: 404 })
    }

    return NextResponse.json({
      fbo: {
        ...fbo,
        qr_enabled_by_admin: !!fbo.qr_enabled_by_admin,
        qr_opted_in_by_fbo: !!fbo.qr_opted_in_by_fbo,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      opted_in,
      operational_mode,
      allow_pay_later,
      merchant_upi_id,
      table_count,
      brand_color,
      logo_url,
    } = body

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} },
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch caller's FBO record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: fbo } = await (supabase as any)
      .from('fbos')
      .select('*')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (!fbo) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: fboById } = await (supabase as any)
        .from('fbos')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      fbo = fboById
    }

    if (!fbo) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: firstFbo } = await (supabase as any)
        .from('fbos')
        .select('*')
        .limit(1)
        .maybeSingle()
      fbo = firstFbo
    }

    if (!fbo) {
      return NextResponse.json({ error: 'FBO profile not found' }, { status: 404 })
    }

    if (!fbo.qr_enabled_by_admin) {
      return NextResponse.json({ error: 'QR Ordering is not enabled by Admin for your account.' }, { status: 403 })
    }

    const updates: Record<string, unknown> = {}
    if (typeof opted_in === 'boolean') updates.qr_opted_in_by_fbo = opted_in
    if (operational_mode) updates.operational_mode = operational_mode
    if (typeof allow_pay_later === 'boolean') updates.allow_pay_later = allow_pay_later
    if (merchant_upi_id !== undefined) updates.merchant_upi_id = merchant_upi_id
    if (typeof table_count === 'number') updates.table_count = table_count
    if (brand_color) updates.brand_color = brand_color
    if (logo_url !== undefined) updates.logo_url = logo_url

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedFbo, error: updateErr } = await (supabase as any)
      .from('fbos')
      .update(updates)
      .eq('id', fbo.id)
      .select()
      .single()

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    return NextResponse.json({ success: true, fbo: updatedFbo })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
