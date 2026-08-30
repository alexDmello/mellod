'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'
import { verifyTableToken } from '@/lib/hmac'
import {
  Utensils,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  Minus,
  Search,
  ChevronRight,
  Sparkles,
} from 'lucide-react'

interface CartItem {
  menu_item_id: string
  name: string
  price: number
  quantity: number
}

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  category_id: string | null
  is_veg: boolean
  is_available: boolean
  image_url: string | null
}

interface Category {
  id: string
  name: string
}

interface FboInfo {
  id: string
  business_name: string
  brand_color: string | null
  logo_url: string | null
  operational_mode: string | null
  allow_pay_later: boolean
  merchant_upi_id: string | null
  token_signing_salt: string | null
}

export default function CustomerQROrderingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ t?: string; type?: string; ct?: string }>
}) {
  const { slug } = use(params)
  const { t: tableToken, type: qrType, ct: counterToken } = use(searchParams)

  const [fbo, setFbo] = useState<FboInfo | null>(null)
  const [tableNumber, setTableNumber] = useState<string | null>(null)
  const [tableId, setTableId] = useState<string | null>(null)
  const [isCounter, setIsCounter] = useState(false)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [vegOnly, setVegOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [cart, setCart] = useState<CartItem[]>([])
  const [orderNotes, setOrderNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'direct_upi_manual' | 'cash'>('direct_upi_manual')
  const [submittingOrder, setSubmittingOrder] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<{ id: string; total_amount: number; status: string } | null>(null)
  const [cartOpen, setCartOpen] = useState(false)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const initData = useCallback(async () => {
    try {
      // Fetch FBO details by slug
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: fboData, error: fboErr } = await (supabase as any)
        .from('fbos')
        .select('id, business_name, brand_color, logo_url, operational_mode, allow_pay_later, merchant_upi_id, token_signing_salt')
        .eq('slug', slug)
        .single()

      if (fboErr || !fboData) {
        setTokenValid(false)
        setLoading(false)
        return
      }

      setFbo(fboData)

      // Verify HMAC Token
      const salt = fboData.token_signing_salt || 'default_salt'

      if (qrType === 'counter' && counterToken) {
        const payload = await verifyTableToken(counterToken, salt)
        if (payload) {
          setIsCounter(true)
          setTableNumber('Counter')
          setTokenValid(true)
        } else {
          setTokenValid(false)
        }
      } else if (tableToken) {
        const payload = await verifyTableToken(tableToken, salt)
        if (payload) {
          setTableNumber(payload.table_number)
          setTableId(payload.table_id)
          setTokenValid(true)
        } else {
          setTokenValid(false)
        }
      } else {
        // Fallback for direct browser preview
        setTableNumber('Guest')
        setTokenValid(true)
      }

      // Fetch Menu & Categories
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: cats } = await (supabase as any)
        .from('categories')
        .select('*')
        .eq('fbo_id', fboData.id)
        .order('sort_order', { ascending: true })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: items } = await (supabase as any)
        .from('menu_items')
        .select('*')
        .eq('fbo_id', fboData.id)
        .eq('is_available', true)

      setCategories(cats || [])
      setMenuItems(items || [])
    } catch (e) {
      console.error(e)
      setTokenValid(false)
    } finally {
      setLoading(false)
    }
  }, [slug, tableToken, qrType, counterToken, supabase])

  useEffect(() => {
    initData()
  }, [initData])

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.menu_item_id === item.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx].quantity += 1
        return copy
      }
      return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1 }]
    })
  }

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.menu_item_id === itemId)
      if (idx >= 0) {
        const copy = [...prev]
        if (copy[idx].quantity > 1) {
          copy[idx].quantity -= 1
          return copy
        }
        return copy.filter((i) => i.menu_item_id !== itemId)
      }
      return prev
    })
  }

  const totalAmount = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0)

  // Submit Order
  const handleSubmitOrder = async () => {
    if (!fbo || !cart.length) return
    setSubmittingOrder(true)

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fbo_id: fbo.id,
          order_type: isCounter ? 'counter' : 'table',
          payment_method: paymentMethod,
          items: cart,
          notes: orderNotes,
          client_reference_id: crypto.randomUUID(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to place order')
      } else {
        setCreatedOrder(data.order)
        setCart([])
        setCartOpen(false)
      }
    } catch {
      alert('Network error placing order')
    } finally {
      setSubmittingOrder(false)
    }
  }

  const filteredItems = menuItems.filter((item) => {
    if (vegOnly && !item.is_veg) return false
    if (selectedCategory !== 'all' && item.category_id !== selectedCategory) return false
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#09090b] text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  if (tokenValid === false) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#09090b] p-6 text-center text-slate-100">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Invalid or Expired QR Code</h2>
        <p className="text-xs text-slate-400 max-w-xs mb-6">
          The table QR code you scanned could not be verified. Please re-scan the QR code on your table or ask restaurant staff for assistance.
        </p>
      </div>
    )
  }

  // Order Success Screen
  if (createdOrder) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090b] p-6 text-center text-slate-100">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-xl">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-bold mb-1">Order Received!</h2>
        <p className="text-xs text-slate-400 mb-6">Order #{createdOrder.id.slice(0, 8)}</p>

        <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-5 mb-6 text-left space-y-3">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Table/Location</span>
            <span className="font-bold text-white">{tableNumber}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Total Amount</span>
            <span className="font-bold text-emerald-400">₹{createdOrder.total_amount}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Status</span>
            <span className="font-bold text-indigo-400 capitalize">{createdOrder.status.replace('_', ' ')}</span>
          </div>

          {fbo?.merchant_upi_id && paymentMethod === 'direct_upi_manual' && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-center">
              <p className="text-xs font-semibold text-amber-400 mb-1">Direct UPI Soundbox Payment</p>
              <p className="text-xs font-mono text-white select-all">{fbo.merchant_upi_id}</p>
              <p className="text-[11px] text-slate-400 mt-1">Please pay via your UPI App. Staff will verify via soundbox.</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setCreatedOrder(null)}
          className="rounded-xl bg-indigo-600 px-6 py-3 text-xs font-semibold text-white shadow-lg hover:bg-indigo-500"
        >
          Back to Menu
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100 pb-28">
      {/* Outlet Header */}
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#09090b]/90 px-4 py-3 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
            <Utensils className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">{fbo?.business_name}</h1>
            <p className="text-[11px] text-slate-400">Table {tableNumber}</p>
          </div>
        </div>

        {/* Veg Only Toggle */}
        <button
          onClick={() => setVegOnly(!vegOnly)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
            vegOnly
              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
              : 'border-slate-800 bg-slate-900 text-slate-400'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${vegOnly ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          Veg Only
        </button>
      </header>

      {/* Category Pills & Search */}
      <div className="sticky top-[57px] z-10 border-b border-slate-800/80 bg-[#09090b] p-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dishes..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`rounded-xl px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-xl px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Dishes List */}
      <div className="p-4 space-y-3 max-w-2xl mx-auto">
        {filteredItems.length === 0 ? (
          <p className="text-center text-xs text-slate-500 py-12">No menu items found</p>
        ) : (
          filteredItems.map((item) => {
            const inCart = cart.find((i) => i.menu_item_id === item.id)
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 flex items-center justify-between shadow-lg"
              >
                <div className="pr-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full border ${
                        item.is_veg ? 'border-emerald-500 bg-emerald-500/20' : 'border-rose-500 bg-rose-500/20'
                      }`}
                    />
                    <h3 className="font-semibold text-white text-sm">{item.name}</h3>
                  </div>
                  {item.description && <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>}
                  <p className="text-sm font-bold text-emerald-400">₹{item.price}</p>
                </div>

                {inCart ? (
                  <div className="flex items-center gap-3 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-indigo-400">
                    <button onClick={() => removeFromCart(item.id)} className="p-1 hover:text-white">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-mono text-xs font-bold text-white">{inCart.quantity}</span>
                    <button onClick={() => addToCart(item)} className="p-1 hover:text-white">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(item)}
                    className="flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Floating Cart Drawer Button */}
      {cart.length > 0 && !cartOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-30 max-w-md mx-auto">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full flex items-center justify-between rounded-2xl bg-indigo-600 p-4 text-white shadow-2xl hover:bg-indigo-500 transition"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 font-bold">
                {totalItems}
              </div>
              <span className="text-xs font-semibold">View Order</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">₹{totalAmount}</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </button>
        </div>
      )}

      {/* Checkout Drawer Modal */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-auto rounded-t-3xl border-t border-slate-800 bg-[#09090b] p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-indigo-400" /> Your Order ({totalItems})
              </h2>
              <button onClick={() => setCartOpen(false)} className="text-xs text-slate-400 hover:text-white">
                Close
              </button>
            </div>

            <div className="divide-y divide-slate-800 space-y-2">
              {cart.map((item) => (
                <div key={item.menu_item_id} className="flex items-center justify-between pt-2">
                  <div>
                    <p className="text-xs font-semibold text-white">{item.name}</p>
                    <p className="text-[11px] text-slate-400">
                      ₹{item.price} × {item.quantity}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-800 pt-3">
              <label className="block text-xs font-medium text-slate-300 mb-1">Special Cooking Instructions</label>
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="e.g. Less spicy, Extra napkins"
                className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod('direct_upi_manual')}
                  className={`rounded-xl border p-3 text-xs font-semibold transition ${
                    paymentMethod === 'direct_upi_manual'
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  Direct UPI / QR
                </button>
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`rounded-xl border p-3 text-xs font-semibold transition ${
                    paymentMethod === 'cash'
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  Pay Cash at Counter
                </button>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400">Total Payable</p>
                <p className="text-xl font-bold text-emerald-400">₹{totalAmount}</p>
              </div>
              <button
                onClick={handleSubmitOrder}
                disabled={submittingOrder}
                className="rounded-2xl bg-indigo-600 px-6 py-3 text-xs font-semibold text-white shadow-lg hover:bg-indigo-500 disabled:opacity-50"
              >
                {submittingOrder ? 'Placing Order...' : 'Confirm Order ↗'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
