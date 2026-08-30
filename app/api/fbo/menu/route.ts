import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

async function getFbo(supabase: ReturnType<typeof createServerClient>, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: fbo } = await (supabase as any)
    .from('fbos')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle()

  if (!fbo) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fboById } = await (supabase as any)
      .from('fbos')
      .select('id')
      .eq('id', userId)
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

  return fbo
}

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} },
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const fbo = await getFbo(supabase, user.id)
    if (!fbo) return NextResponse.json({ error: 'FBO profile not found' }, { status: 404 })

    // Fetch categories (try fbo_id first, then tenant_id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: categories } = await (supabase as any)
      .from('categories')
      .select('*')
      .eq('fbo_id', fbo.id)
      .order('sort_order', { ascending: true })

    if (!categories || categories.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tCats } = await (supabase as any)
        .from('categories')
        .select('*')
        .eq('tenant_id', fbo.id)
        .order('sort_order', { ascending: true })
      if (tCats) categories = tCats
    }

    // Fetch menu items (try fbo_id first, then tenant_id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: menuItems } = await (supabase as any)
      .from('menu_items')
      .select('*')
      .eq('fbo_id', fbo.id)
      .order('created_at', { ascending: true })

    if (!menuItems || menuItems.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tItems } = await (supabase as any)
        .from('menu_items')
        .select('*')
        .eq('tenant_id', fbo.id)
        .order('created_at', { ascending: true })
      if (tItems) menuItems = tItems
    }

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

    const fbo = await getFbo(supabase, user.id)
    if (!fbo) return NextResponse.json({ error: 'FBO profile not found' }, { status: 404 })

    if (type === 'category') {
      if (id) {
        // Update category
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: cat } = await (supabase as any)
          .from('categories')
          .update({ name, sort_order: sort_order || 0 })
          .eq('id', id)
          .select()
          .single()
        return NextResponse.json({ category: cat })
      } else {
        // Insert category with column fallbacks
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let { data: cat, error: insErr } = await (supabase as any)
          .from('categories')
          .insert({ fbo_id: fbo.id, name, sort_order: sort_order || 0 })
          .select()
          .single()

        if (insErr) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: catTenant } = await (supabase as any)
            .from('categories')
            .insert({ tenant_id: fbo.id, name, sort_order: sort_order || 0 })
            .select()
            .single()
          cat = catTenant
        }
        return NextResponse.json({ category: cat })
      }
    } else if (type === 'menu_item') {
      if (id) {
        // Update menu item
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: item } = await (supabase as any)
          .from('menu_items')
          .update({
            name,
            description: description || null,
            price: Number(price),
            category_id: category_id || null,
            is_veg: typeof is_veg === 'boolean' ? is_veg : true,
            is_available: typeof is_available === 'boolean' ? is_available : true,
            image_url: image_url || null,
          })
          .eq('id', id)
          .select()
          .single()
        return NextResponse.json({ menu_item: item })
      } else {
        // Insert menu item with column fallbacks
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let { data: item, error: insErr } = await (supabase as any)
          .from('menu_items')
          .insert({
            fbo_id: fbo.id,
            name,
            description: description || null,
            price: Number(price),
            category_id: category_id || null,
            is_veg: typeof is_veg === 'boolean' ? is_veg : true,
            is_available: typeof is_available === 'boolean' ? is_available : true,
            image_url: image_url || null,
          })
          .select()
          .single()

        if (insErr) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: itemTenant } = await (supabase as any)
            .from('menu_items')
            .insert({
              tenant_id: fbo.id,
              name,
              description: description || null,
              price: Number(price),
              category_id: category_id || null,
              is_veg: typeof is_veg === 'boolean' ? is_veg : true,
              is_available: typeof is_available === 'boolean' ? is_available : true,
              image_url: image_url || null,
            })
            .select()
            .single()
          item = itemTenant
        }
        return NextResponse.json({ menu_item: item })
      }
    }

    return NextResponse.json({ error: 'Invalid operation type' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!type || !id) {
      return NextResponse.json({ error: 'Missing type or id' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} },
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const fbo = await getFbo(supabase, user.id)
    if (!fbo) return NextResponse.json({ error: 'FBO profile not found' }, { status: 404 })

    if (type === 'category') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('categories').delete().eq('id', id)
      return NextResponse.json({ success: true })
    } else if (type === 'menu_item') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('menu_items').delete().eq('id', id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
