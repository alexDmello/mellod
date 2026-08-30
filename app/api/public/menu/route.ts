import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get('slug')
    const fboId = searchParams.get('fbo_id')

    if (!slug && !fboId) {
      return NextResponse.json({ error: 'Missing slug or fbo_id parameter' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Fetch FBO profile
    let fboQuery = supabase.from('fbos').select('id, business_name, brand_color, logo_url, operational_mode, allow_pay_later, merchant_upi_id, token_signing_salt, qr_enabled_by_admin, is_active, slug')

    if (slug) {
      fboQuery = fboQuery.eq('slug', slug)
    } else if (fboId) {
      fboQuery = fboQuery.eq('id', fboId)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fbo, error: fboErr } = await (fboQuery as any).single()

    if (fboErr || !fbo) {
      return NextResponse.json({ error: 'FBO outlet not found' }, { status: 404 })
    }

    // 2. Fetch categories with fallback column support (fbo_id / tenant_id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: categories } = await (supabase as any)
      .from('categories')
      .select('*')
      .eq('fbo_id', fbo.id)
      .order('sort_order', { ascending: true })

    if (!categories || categories.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tenantCats } = await (supabase as any)
        .from('categories')
        .select('*')
        .eq('tenant_id', fbo.id)
        .order('sort_order', { ascending: true })
      if (tenantCats) categories = tenantCats
    }

    // 3. Fetch menu items with fallback column support (fbo_id / tenant_id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: menuItems } = await (supabase as any)
      .from('menu_items')
      .select('*')
      .eq('fbo_id', fbo.id)
      .eq('is_available', true)
      .order('created_at', { ascending: true })

    if (!menuItems || menuItems.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tenantItems } = await (supabase as any)
        .from('menu_items')
        .select('*')
        .eq('tenant_id', fbo.id)
        .eq('is_available', true)
        .order('created_at', { ascending: true })
      if (tenantItems) menuItems = tenantItems
    }

    return NextResponse.json({
      fbo,
      categories: categories || [],
      menu_items: menuItems || [],
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
