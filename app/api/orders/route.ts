import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { ORDER_STATUS_TRANSITIONS } from '@/lib/constants'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      fbo_id,
      order_type,
      table_session_id,
      payment_method,
      items, // [{ menu_item_id, quantity, customization_details? }]
      notes,
      client_reference_id: clientRef,
    } = body

    if (!fbo_id || !order_type || !items?.length || !payment_method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll: () => [], setAll: () => {} },
    })

    const client_reference_id = clientRef || crypto.randomUUID()

    // ── Idempotency check ────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingOrder } = await (supabase as any)
      .from('orders')
      .select('id, status, payment_status, total_amount')
      .eq('client_reference_id', client_reference_id)
      .single()

    if (existingOrder) {
      return NextResponse.json({ order: existingOrder, idempotent: true })
    }

    // ── Price recalculation ──────────────────────────────────────────────────
    const menuItemIds = items.map((i: { menu_item_id: string }) => i.menu_item_id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: menuItems, error: menuError } = await (supabase as any)
      .from('menu_items')
      .select('id, name, price, is_available, fbo_id')
      .in('id', menuItemIds)
      .eq('fbo_id', fbo_id)

    if (menuError || !menuItems?.length) {
      return NextResponse.json({ error: 'Menu items not found' }, { status: 422 })
    }

    interface MenuItemRecord {
      id: string
      name: string
      price: number
      is_available: boolean
      fbo_id: string
    }

    const itemMap = new Map<string, MenuItemRecord>((menuItems as MenuItemRecord[] || []).map((m) => [m.id, m]))
    for (const item of items) {
      const menuItem = itemMap.get(item.menu_item_id)
      if (!menuItem) {
        return NextResponse.json({ error: `Item ${item.menu_item_id} not found` }, { status: 422 })
      }
      if (!menuItem.is_available) {
        return NextResponse.json({ error: `Item "${menuItem.name}" is currently unavailable` }, { status: 422 })
      }
    }

    let total_amount = 0
    const orderItemsToInsert = items.map((item: { menu_item_id: string; quantity: number; customization_details?: unknown }) => {
      const menuItem = itemMap.get(item.menu_item_id)!
      const lineTotal = menuItem.price * item.quantity
      total_amount += lineTotal
      return {
        menu_item_id: item.menu_item_id,
        item_name: menuItem.name,
        quantity: item.quantity,
        unit_price: menuItem.price,
        customization_details: item.customization_details || null,
      }
    })

    // Fetch FBO settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fbo } = await (supabase as any)
      .from('fbos')
      .select('max_order_amount_alert, allow_pay_later, is_active')
      .eq('id', fbo_id)
      .single()

    if (!fbo?.is_active) {
      return NextResponse.json({ error: 'FBO is not active' }, { status: 403 })
    }

    if (fbo.max_order_amount_alert && total_amount > fbo.max_order_amount_alert) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('audit_log').insert({
        fbo_id,
        action: 'order.anomaly_amount_exceeded',
        details: { total_amount, threshold: fbo.max_order_amount_alert },
      })
    }

    let status = 'pending_payment'
    let payment_status = 'unpaid'

    if (payment_method === 'cash' || (payment_method === 'direct_upi_manual' && order_type === 'table' && fbo.allow_pay_later)) {
      if (order_type === 'table' && payment_method !== 'cash') {
        status = 'received'
        payment_status = 'unpaid'
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order, error: orderError } = await (supabase as any)
      .from('orders')
      .insert({
        fbo_id,
        table_session_id: table_session_id || null,
        order_type,
        client_reference_id,
        status,
        payment_status,
        payment_method,
        total_amount: Number(total_amount.toFixed(2)),
        notes: notes || null,
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Order insert error:', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: itemsError } = await (supabase as any)
      .from('order_items')
      .insert(orderItemsToInsert.map((oi: Record<string, unknown>) => ({ ...oi, order_id: order.id })))

    if (itemsError) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('orders').delete().eq('id', order.id)
      return NextResponse.json({ error: 'Failed to insert order items' }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audit_log').insert({
      fbo_id,
      action: 'order.created',
      target_table: 'orders',
      target_id: order.id,
      details: { total_amount, payment_method, order_type, item_count: items.length },
    })

    return NextResponse.json({ order, client_reference_id }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { order_id, new_status, fbo_id, reason, actor_user_id } = body

    if (!order_id || !new_status || !fbo_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll: () => [], setAll: () => {} },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order, error: fetchError } = await (supabase as any)
      .from('orders')
      .select('status, payment_status, fbo_id')
      .eq('id', order_id)
      .eq('fbo_id', fbo_id)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const allowedTransitions = ORDER_STATUS_TRANSITIONS[order.status] || []
    if (!allowedTransitions.includes(new_status)) {
      return NextResponse.json(
        { error: `Invalid transition: ${order.status} → ${new_status}. Allowed: ${allowedTransitions.join(', ')}` },
        { status: 422 }
      )
    }

    const updatePayload: Record<string, unknown> = { status: new_status }
    if (new_status === 'cancelled') {
      if (!reason) {
        return NextResponse.json({ error: 'Cancellation reason is required' }, { status: 400 })
      }
      updatePayload.cancelled_reason = reason
      updatePayload.cancelled_by = actor_user_id || null
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('orders')
      .update(updatePayload)
      .eq('id', order_id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audit_log').insert({
      fbo_id,
      actor_user_id: actor_user_id || null,
      action: `order.status_changed.${new_status}`,
      target_table: 'orders',
      target_id: order_id,
      details: { from: order.status, to: new_status, reason: reason || null },
    })

    return NextResponse.json({ success: true, status: new_status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
