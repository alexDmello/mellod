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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: fbo } = await (supabase as any)
      .from('fbos')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (!fbo) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: fboById } = await (supabase as any)
        .from('fbos')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()
      fbo = fboById
    }

    if (!fbo) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: firstFbo } = await (supabase as any)
        .from('fbos')
        .select('id')
        .limit(1)
        .maybeSingle()
      fbo = firstFbo
    }

    if (!fbo) return NextResponse.json({ error: 'FBO profile not found' }, { status: 404 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: categories } = await (supabase as any)
      .from('categories')
      .select('*')
      .eq('fbo_id', fbo.id)
      .order('sort_order', { ascending: true })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: menuItems } = await (supabase as any)
      .from('menu_items')
      .select('*')
      .eq('fbo_id', fbo.id)
      .order('created_at', { ascending: true })

    return NextResponse.json({ categories: categories || [], menu_items: menuItems || [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, name, sort_order, category_id, description, price, is_veg, is_available, image_url, id } = body

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
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (!fbo) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: fboById } = await (supabase as any)
        .from('fbos')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()
      fbo = fboById
    }

    if (!fbo) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: firstFbo } = await (supabase as any)
        .from('fbos')
        .select('id')
        .limit(1)
        .maybeSingle()
      fbo = firstFbo
    }

    if (!fbo) return NextResponse.json({ error: 'FBO profile not found' }, { status: 404 })

    if (type === 'category') {
      if (id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: cat } = await (supabase as any)
          .from('categories')
          .update({ name, sort_order: sort_order || 0 })
          .eq('id', id)
          .eq('fbo_id', fbo.id)
          .select()
          .single()
        return NextResponse.json({ category: cat })
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: cat } = await (supabase as any)
          .from('categories')
          .insert({ fbo_id: fbo.id, name, sort_order: sort_order || 0 })
          .select()
          .single()
        return NextResponse.json({ category: cat })
      }
    } else if (type === 'menu_item') {
      if (id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: item } = await (supabase as any)
          .from('menu_items')
          .update({
            name,
            description,
            price: Number(price),
            category_id: category_id || null,
            is_veg: typeof is_veg === 'boolean' ? is_veg : true,
            is_available: typeof is_available === 'boolean' ? is_available : true,
            image_url: image_url || null,
          })
          .eq('id', id)
          .eq('fbo_id', fbo.id)
          .select()
          .single()
        return NextResponse.json({ menu_item: item })
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: item } = await (supabase as any)
          .from('menu_items')
          .insert({
            fbo_id: fbo.id,
            name,
            description,
            price: Number(price),
            category_id: category_id || null,
            is_veg: typeof is_veg === 'boolean' ? is_veg : true,
            is_available: typeof is_available === 'boolean' ? is_available : true,
            image_url: image_url || null,
          })
          .select()
          .single()
        return NextResponse.json({ menu_item: item })
      }
    }

    return NextResponse.json({ error: 'Invalid operation type' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
