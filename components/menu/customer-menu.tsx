'use client'

import { useState, useMemo, useCallback } from 'react'
import { ShoppingCart, Minus, Plus, X, Leaf, Drumstick, ChevronRight, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import type { Category, MenuItem } from '@/types/database'

interface CartItem {
  menu_item_id: string
  name: string
  price: number
  quantity: number
  is_veg: boolean
}

interface Tenant {
  id: string
  slug: string
  business_name: string
  brand_color: string
  logo_url: string | null
  operational_mode: string
  allow_pay_later: boolean
}

interface Props {
  tenant: Tenant
  categories: Pick<Category, 'id' | 'name' | 'sort_order'>[]
  menuItems: Pick<MenuItem, 'id' | 'category_id' | 'name' | 'description' | 'price' | 'image_url' | 'is_veg' | 'is_available'>[]
}

export default function CustomerMenu({ tenant, categories, menuItems }: Props) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(categories[0]?.id || null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, typeof menuItems>()
    for (const item of menuItems) {
      const catId = item.category_id || '__uncategorized'
      if (!map.has(catId)) map.set(catId, [])
      map.get(catId)!.push(item)
    }
    return map
  }, [menuItems])

  const cartTotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [cart]
  )
  const cartCount = useMemo(
    () => cart.reduce((sum, i) => sum + i.quantity, 0),
    [cart]
  )

  const updateCart = useCallback((item: typeof menuItems[0], delta: number) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item_id === item.id)
      if (!existing && delta > 0) {
        return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1, is_veg: item.is_veg }]
      }
      if (existing) {
        const newQty = existing.quantity + delta
        if (newQty <= 0) return prev.filter((c) => c.menu_item_id !== item.id)
        return prev.map((c) => c.menu_item_id === item.id ? { ...c, quantity: newQty } : c)
      }
      return prev
    })
  }, [])

  const getItemQty = (id: string) => cart.find((c) => c.menu_item_id === id)?.quantity || 0

  const placeOrder = async (paymentMethod: string) => {
    if (!cart.length) return
    setIsPlacingOrder(true)

    try {
      const clientReferenceId = `${tenant.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant.id,
          order_type: 'table',
          payment_method: paymentMethod,
          items: cart.map((c) => ({ menu_item_id: c.menu_item_id, quantity: c.quantity })),
          notes,
          client_reference_id: clientReferenceId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to place order')
        return
      }

      if (paymentMethod === 'online_pg' && data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        toast.success('Order placed! Kitchen has been notified.', { duration: 5000 })
        setCart([])
        setIsCartOpen(false)
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setIsPlacingOrder(false)
    }
  }

  if (isCartOpen) {
    return (
      <div className="gradient-bg min-h-screen">
        <div className="max-w-lg mx-auto px-4 py-6">
          <button
            onClick={() => setIsCartOpen(false)}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back to menu</span>
          </button>

          <h1 className="text-2xl font-bold text-white mb-6">Your Order</h1>

          {/* Cart items */}
          <div className="space-y-3 mb-6">
            {cart.map((item) => (
              <div key={item.menu_item_id} className="glass-card p-4 flex items-center gap-4">
                <div className={`w-5 h-5 flex-shrink-0 rounded-sm border-2 flex items-center justify-center ${
                  item.is_veg ? 'border-emerald-500' : 'border-red-500'
                }`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${item.is_veg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                  <p className="text-xs text-slate-400">{formatCurrency(item.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateCart({ id: item.menu_item_id } as typeof menuItems[0], -1)}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-white">{item.quantity}</span>
                  <button
                    onClick={() => updateCart({ id: item.menu_item_id } as typeof menuItems[0], 1)}
                    className="w-7 h-7 rounded-lg bg-indigo-600/50 hover:bg-indigo-600 flex items-center justify-center transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <p className="text-sm font-bold text-white w-16 text-right">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="glass-card p-4 mb-6">
            <label className="text-sm font-medium text-slate-300 block mb-2">Special instructions</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="No onions, extra sauce..."
              rows={3}
              className="w-full bg-transparent text-white text-sm placeholder:text-slate-600 resize-none focus:outline-none"
            />
          </div>

          {/* Total */}
          <div className="glass-card p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400 text-sm">Subtotal</span>
              <span className="text-white font-semibold">{formatCurrency(cartTotal)}</span>
            </div>
            <div className="h-px bg-white/10 my-3" />
            <div className="flex justify-between items-center">
              <span className="text-white font-bold">Total</span>
              <span className="text-xl font-black text-white">{formatCurrency(cartTotal)}</span>
            </div>
          </div>

          {/* Payment options */}
          <div className="space-y-3">
            <Button
              onClick={() => placeOrder('online_pg')}
              size="lg"
              className="w-full"
              loading={isPlacingOrder}
            >
              Pay now — {formatCurrency(cartTotal)}
            </Button>

            {tenant.allow_pay_later && (
              <Button
                onClick={() => placeOrder('direct_upi_manual')}
                variant="outline"
                size="lg"
                className="w-full"
                loading={isPlacingOrder}
              >
                Add to table tab (Pay later)
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: `${tenant.brand_color}10` }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/10"
        style={{ backgroundColor: `${tenant.brand_color}20` }}
      >
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logo_url} alt={tenant.business_name} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm"
                style={{ backgroundColor: tenant.brand_color }}
              >
                {tenant.business_name.charAt(0)}
              </div>
            )}
            <h1 className="font-bold text-white text-lg truncate max-w-[180px]">{tenant.business_name}</h1>
          </div>

          {cartCount > 0 && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: tenant.brand_color }}
            >
              <ShoppingCart size={16} />
              <span>{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
              <span className="hidden sm:inline">· {formatCurrency(cartTotal)}</span>
            </button>
          )}
        </div>
      </header>

      {/* Category nav */}
      <div className="sticky top-16 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id)
                  document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' })
                }}
                className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                  activeCategory === cat.id
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                style={activeCategory === cat.id ? { backgroundColor: tenant.brand_color } : {}}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8 pb-32">
        {categories.map((cat) => {
          const items = itemsByCategory.get(cat.id) || []
          if (!items.length) return null

          return (
            <div key={cat.id} id={`cat-${cat.id}`}>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                {cat.name}
                <span className="text-xs font-normal text-slate-500">({items.length})</span>
              </h2>
              <div className="space-y-3">
                {items.map((item) => {
                  const qty = getItemQty(item.id)
                  return (
                    <div key={item.id} className="glass-card p-4 flex gap-4 hover:border-white/15 transition-all">
                      {/* Veg/non-veg indicator */}
                      <div className={`mt-1 w-5 h-5 flex-shrink-0 rounded-sm border-2 flex items-center justify-center ${
                        item.is_veg ? 'border-emerald-500' : 'border-red-500'
                      }`}>
                        <div className={`w-2.5 h-2.5 rounded-full ${item.is_veg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
                        )}
                        <p className="font-bold text-white mt-2">{formatCurrency(item.price)}</p>
                      </div>

                      {/* Item image */}
                      {item.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                        />
                      )}

                      {/* Add/qty control */}
                      <div className="flex-shrink-0 flex flex-col items-end justify-end">
                        {qty === 0 ? (
                          <button
                            onClick={() => updateCart(item, 1)}
                            className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95"
                            style={{ backgroundColor: `${tenant.brand_color}30`, color: tenant.brand_color }}
                          >
                            ADD
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 px-2 py-1 rounded-xl"
                               style={{ backgroundColor: `${tenant.brand_color}20` }}>
                            <button
                              onClick={() => updateCart(item, -1)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                            >
                              <Minus size={14} style={{ color: tenant.brand_color }} />
                            </button>
                            <span className="w-5 text-center text-sm font-bold text-white">{qty}</span>
                            <button
                              onClick={() => updateCart(item, 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                            >
                              <Plus size={14} style={{ color: tenant.brand_color }} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Sticky cart CTA */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-between px-6 shadow-2xl transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: tenant.brand_color, boxShadow: `0 8px 32px ${tenant.brand_color}40` }}
            >
              <span className="bg-white/20 rounded-lg px-2.5 py-0.5 text-sm font-black">{cartCount}</span>
              <span>View Order</span>
              <span>{formatCurrency(cartTotal)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
