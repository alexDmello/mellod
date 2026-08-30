'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Database, Order } from '@/types/database'
import { ORDER_STATUS_TRANSITIONS } from '@/lib/constants'
import { chimePlayer, cacheOrders, getCachedOrders } from '../../lib/pwa'
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Printer,
  XCircle,
  WifiOff,
  QrCode,
} from 'lucide-react'

interface KDSBoardProps {
  fboId: string
  fboName: string
  merchantUpiId?: string | null
}

export function KDSBoard({ fboId, fboName, merchantUpiId }: KDSBoardProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [confirmingUpiId, setConfirmingUpiId] = useState<string | null>(null)
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const supabase = useMemo(() => {
    return createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }, [])

  // Toggle sound chime unlock
  const toggleSound = () => {
    if (!soundEnabled) {
      chimePlayer.unlock()
      chimePlayer.playNewOrderChime()
      setSoundEnabled(true)
    } else {
      setSoundEnabled(false)
    }
  }

  // Fetch initial orders
  const fetchOrders = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('orders')
        .select('*')
        .eq('fbo_id', fboId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      setOrders(data || [])
      await cacheOrders(data || [])
      setIsOffline(false)
    } catch {
      setIsOffline(true)
      const cached = await getCachedOrders()
      if (cached.length) setOrders(cached)
    } finally {
      setLoading(false)
    }
  }, [fboId, supabase])

  useEffect(() => {
    fetchOrders()

    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Realtime channel subscription
    const channel = supabase
      .channel(`kds_${fboId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `fbo_id=eq.${fboId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (payload: any) => {
          const changed = payload.new as Order

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            if (payload.eventType === 'INSERT' && soundEnabled) {
              chimePlayer.playNewOrderChime()
            }
            setOrders((prev) => {
              const idx = prev.findIndex((o) => o.id === changed.id)
              if (idx >= 0) {
                const copy = [...prev]
                copy[idx] = changed
                return copy
              }
              return [changed, ...prev]
            })
          }
        }
      )
      .subscribe()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      supabase.removeChannel(channel)
    }
  }, [fboId, fetchOrders, soundEnabled, supabase])

  // Move status forward
  const handleTransition = async (orderId: string, currentStatus: string) => {
    const allowed = ORDER_STATUS_TRANSITIONS[currentStatus] || []
    if (!allowed.length) return
    const nextStatus = allowed[0]

    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          new_status: nextStatus,
          fbo_id: fboId,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to update order status')
      }
    } catch {
      alert('Network error updating status')
    }
  }

  // Staff manual UPI confirmation
  const handleConfirmUpi = async (orderId: string) => {
    setConfirmingUpiId(orderId)
    try {
      const res = await fetch('/api/orders/confirm-upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          fbo_id: fboId,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to confirm payment')
      } else {
        fetchOrders()
      }
    } catch {
      alert('Network error confirming payment')
    } finally {
      setConfirmingUpiId(null)
    }
  }

  // Cancel order
  const handleCancelOrder = async () => {
    if (!cancellingOrderId || !cancelReason.trim()) return

    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: cancellingOrderId,
          new_status: 'cancelled',
          fbo_id: fboId,
          reason: cancelReason,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to cancel order')
      } else {
        setCancellingOrderId(null)
        setCancelReason('')
        fetchOrders()
      }
    } catch {
      alert('Network error cancelling order')
    }
  }

  const activeOrders = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled')

  const columns = [
    { title: 'Received', status: 'received', color: 'border-blue-500/40 bg-blue-500/5' },
    { title: 'Preparing', status: 'preparing', color: 'border-yellow-500/40 bg-yellow-500/5' },
    { title: 'Ready', status: 'ready', color: 'border-emerald-500/40 bg-emerald-500/5' },
  ]

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-slate-100 p-4">
      {/* Top Bar */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{fboName} — Kitchen Display</h1>
            <p className="text-xs text-slate-400">
              {activeOrders.length} active orders • Realtime connected
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isOffline && (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">
              <WifiOff className="h-3.5 w-3.5" />
              Offline Mode
            </div>
          )}

          <button
            onClick={toggleSound}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              soundEnabled
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {soundEnabled ? 'Chime ON' : 'Chime Muted'}
          </button>
        </div>
      </header>

      {/* Pending Payment Alert Card Section */}
      {orders.some((o) => o.status === 'pending_payment') && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-400">
            <AlertCircle className="h-4 w-4" /> Pending Direct UPI Confirmations (Staff Action Required)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {orders
              .filter((o) => o.status === 'pending_payment')
              .map((order) => (
                <div
                  key={order.id}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                      <span>Order #{order.id.slice(0, 8)}</span>
                      <span className="text-amber-400 font-semibold">₹{order.total_amount}</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Method: <span className="font-semibold text-white">{order.payment_method}</span>
                    </p>
                    {merchantUpiId && (
                      <p className="text-[11px] text-slate-400 mt-1">UPI: {merchantUpiId}</p>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleConfirmUpi(order.id)}
                      disabled={confirmingUpiId === order.id}
                      className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {confirmingUpiId === order.id ? 'Confirming...' : 'Confirm Payment'}
                    </button>
                    <button
                      onClick={() => setCancellingOrderId(order.id)}
                      className="rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Kanban Board Columns */}
      <div className="grid gap-6 md:grid-cols-3">
        {columns.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.status)
          return (
            <div
              key={col.status}
              className={`rounded-xl border ${col.color} p-4 flex flex-col h-[calc(100vh-220px)]`}
            >
              <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-semibold text-white">{col.title}</h3>
                <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-mono text-slate-300">
                  {colOrders.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {colOrders.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-12">No orders in this state</p>
                ) : (
                  colOrders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                          <span className="font-mono text-sm font-bold text-indigo-400">
                            {order.token_number || `#${order.id.slice(0, 6)}`}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock className="h-3 w-3" />
                            {new Date(order.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="text-xs text-slate-300 space-y-1 mb-3">
                          <p>
                            Type:{' '}
                            <span className="font-semibold text-white capitalize">{order.order_type}</span>
                          </p>
                          <p>
                            Total: <span className="font-semibold text-emerald-400">₹{order.total_amount}</span>
                          </p>
                          {order.notes && (
                            <p className="rounded bg-slate-800/60 p-1.5 italic text-slate-400 text-[11px]">
                              "{order.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                        <button
                          onClick={() => window.print()}
                          title="Print Ticket"
                          className="rounded-lg border border-slate-800 bg-slate-800/50 p-2 text-slate-400 hover:text-white hover:bg-slate-700"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleTransition(order.id, order.status)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Next Status
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Cancel Reason Modal */}
      {cancellingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-500" /> Cancel Order
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Please state why this order is being cancelled.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Out of stock, Customer cancelled, Invalid payment"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCancellingOrderId(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Back
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={!cancelReason.trim()}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
