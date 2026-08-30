import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    const supabase = createServerClient(supabaseUrl, serviceKey, {
      cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} },
    })

    // Fetch FBOs using server credentials
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('fbos')
      .select('id, business_name, contact_person, phone, slug, qr_enabled_by_admin, qr_opted_in_by_fbo')
      .order('business_name', { ascending: true })

    if (error) {
      // Fallback gracefully if columns are not created yet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rawData, error: rawErr } = await (supabase as any)
        .from('fbos')
        .select('id, business_name, contact_person, phone')
        .order('business_name', { ascending: true })

      if (rawErr) {
        return NextResponse.json({ error: rawErr.message }, { status: 500 })
      }

      const formatted = (rawData || []).map((f: Record<string, unknown>) => ({
        ...f,
        slug: null,
        qr_enabled_by_admin: false,
        qr_opted_in_by_fbo: false,
      }))

      return NextResponse.json({ fbos: formatted, migration_needed: true })
    }

    const formatted = (data || []).map((f: Record<string, unknown>) => ({
      ...f,
      qr_enabled_by_admin: !!f.qr_enabled_by_admin,
      qr_opted_in_by_fbo: !!f.qr_opted_in_by_fbo,
    }))

    return NextResponse.json({ fbos: formatted, migration_needed: false })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
