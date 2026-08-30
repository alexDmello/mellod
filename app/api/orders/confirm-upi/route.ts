import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(req: NextRequest) {
  try {
    const { order_id, fbo_id, actor_user_id } = await req.json()

    if (!order_id || !fbo_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll: () => [], setAll: () => {} },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order } = await (supabase as any)
      .from('orders')
      .select('id, status, payment_status, payment_method, order_type, fbo_id')
      .eq('id', order_id)
      .eq('fbo_id', fbo_id)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (order.payment_method !== 'direct_upi_manual') {
      return NextResponse.json({ error: 'Not a direct UPI order' }, { status: 422 })
    }
    if (order.payment_status === 'paid') {
      return NextResponse.json({ already: true, message: 'Already confirmed' })
    }

    let token_number: string | null = null
    if (order.order_type === 'counter') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tokenData } = await (supabase as any)
        .rpc('generate_daily_token', { p_fbo_id: fbo_id })
      token_number = tokenData as string
    }

    const updatePayload: Record<string, unknown> = {
      status: 'received',
      payment_status: 'paid',
    }
    if (token_number) updatePayload.token_number = token_number

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('orders')
      .update(updatePayload)
      .eq('id', order_id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audit_log').insert({
      fbo_id,
      actor_user_id: actor_user_id || null,
      action: 'payment.direct_upi_confirmed',
      target_table: 'orders',
      target_id: order_id,
      details: { token_number, confirmed_by: 'staff' },
    })

    return NextResponse.json({ success: true, status: 'received', token_number })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
