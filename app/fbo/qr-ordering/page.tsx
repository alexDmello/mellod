'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  QrCode,
  AlertTriangle,
  CheckCircle,
  Settings,
  Tv,
  Plus,
  RotateCw,
  Printer,
  Utensils,
  ToggleLeft,
  ToggleRight,
  Download,
} from 'lucide-react'

interface FboData {
  id: string
  business_name: string
  slug: string | null
  qr_enabled_by_admin: boolean
  qr_opted_in_by_fbo: boolean
  operational_mode: 'dine_in' | 'counter_qsr' | 'hybrid'
  allow_pay_later: boolean
  merchant_upi_id: string | null
  table_count: number
  brand_color: string
}

interface TableData {
  id: string
  table_number: string
  signed_token: string
  qr_url: string
  full_url: string
}

interface MenuItem {
  id: string
  name: string
  price: number
  category_id: string | null
  is_veg: boolean
  is_available: boolean
}

interface Category {
  id: string
  name: string
}

export default function FBOQROrderingPage() {
  const [fbo, setFbo] = useState<FboData | null>(null)
  const [tables, setTables] = useState<TableData[]>([])
  const [counterQr, setCounterQr] = useState<{ qr_url: string; full_url: string } | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'tables' | 'menu' | 'settings'>('tables')

  // Table batch creation state
  const [tableCountInput, setTableCountInput] = useState(10)
  const [generatingTables, setGeneratingTables] = useState(false)

  // Menu item modal state
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [newItemVeg, setNewItemVeg] = useState(true)
  const [newItemCategoryId, setNewItemCategoryId] = useState('')
  const [addingItem, setAddingItem] = useState(false)

  // Category modal state
  const [newCatName, setNewCatName] = useState('')

  // Fetch FBO Profile & Settings
  const loadFboData = useCallback(async () => {
    try {
      const res = await fetch('/api/fbo/qr-settings')
      if (res.ok) {
        const data = await res.json()
        setFbo(data.fbo)
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  // Fetch Tables
  const loadTables = useCallback(async () => {
    try {
      const res = await fetch('/api/fbo/tables')
      if (res.ok) {
        const data = await res.json()
        setTables(data.tables || [])
        setCounterQr(data.counter_qr || null)
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  // Fetch Menu
  const loadMenu = useCallback(async () => {
    try {
      const res = await fetch('/api/fbo/menu')
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
        setMenuItems(data.menu_items || [])
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    async function init() {
      await loadFboData()
      await loadTables()
      await loadMenu()
      setLoading(false)
    }
    init()
  }, [loadFboData, loadTables, loadMenu])

  // Handle FBO Opt-in
  const handleOptIn = async (optedIn: boolean) => {
    try {
      const res = await fetch('/api/fbo/qr-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opted_in: optedIn }),
      })
      if (res.ok) {
        const data = await res.json()
        setFbo(data.fbo)
      }
    } catch {
      alert('Failed to update opt-in status')
    }
  }

  // Handle batch table generation
  const handleGenerateTables = async () => {
    setGeneratingTables(true)
    try {
      const res = await fetch('/api/fbo/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_count: tableCountInput }),
      })
      if (res.ok) {
        await loadTables()
        await loadFboData()
      } else {
        alert('Failed to generate tables')
      }
    } catch {
      alert('Error generating tables')
    } finally {
      setGeneratingTables(false)
    }
  }

  // Rotate table token
  const handleRotateToken = async (tableId: string) => {
    try {
      const res = await fetch('/api/fbo/tables/rotate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: tableId }),
      })
      if (res.ok) {
        await loadTables()
      }
    } catch {
      alert('Error rotating token')
    }
  }

  // Add category
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    try {
      const res = await fetch('/api/fbo/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'category', name: newCatName }),
      })
      if (res.ok) {
        setNewCatName('')
        await loadMenu()
      }
    } catch {
      alert('Error adding category')
    }
  }

  // Add menu item
  const handleAddMenuItem = async () => {
    if (!newItemName.trim() || !newItemPrice) return
    setAddingItem(true)
    try {
      const res = await fetch('/api/fbo/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'menu_item',
          name: newItemName,
          price: Number(newItemPrice),
          is_veg: newItemVeg,
          category_id: newItemCategoryId || null,
        }),
      })
      if (res.ok) {
        setNewItemName('')
        setNewItemPrice('')
        await loadMenu()
      }
    } catch {
      alert('Error adding menu item')
    } finally {
      setAddingItem(false)
    }
  }

  // Toggle item availability
  const handleToggleAvailable = async (item: MenuItem) => {
    try {
      const res = await fetch('/api/fbo/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'menu_item',
          id: item.id,
          name: item.name,
          price: item.price,
          is_available: !item.is_available,
        }),
      })
      if (res.ok) await loadMenu()
    } catch {
      alert('Error updating item')
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  // GATING CONDITION 1: Admin has not enabled feature for this FBO
  if (!fbo?.qr_enabled_by_admin) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 text-center backdrop-blur-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">QR Ordering Not Activated</h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            The QR Ordering feature is currently disabled for your restaurant outlet. Please contact the Mellod Admin team to activate this feature for your business.
          </p>
          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-4 py-2 text-xs font-mono text-slate-300">
            Status: <span className="text-amber-400 font-semibold">Pending Admin Activation</span>
          </div>
        </div>
      </div>
    )
  }

  // GATING CONDITION 2: Admin enabled, but FBO has not opted in yet
  if (!fbo.qr_opted_in_by_fbo) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-indigo-500/30 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <QrCode className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Enable QR Ordering for {fbo.business_name}</h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto text-sm">
            Admin has authorized QR Ordering for your outlet! Turn it on now to generate table QR codes, manage your digital menu, and launch the Kitchen Display System (KDS).
          </p>
          <button
            onClick={() => handleOptIn(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500 transition"
          >
            <CheckCircle className="h-5 w-5" /> Enable QR Ordering Now
          </button>
        </div>
      </div>
    )
  }

  // UNLOCKED: FBO QR CONTROL PANEL
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 text-slate-100">
      {/* Top Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{fbo.business_name}</h1>
              <p className="text-xs text-slate-400">QR Ordering Control Panel • Slug: {fbo.slug}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOptIn(false)}
            className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/20"
          >
            Opt Out / Disable
          </button>
          <a
            href="/fbo/kds"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-lg transition"
          >
            <Tv className="h-4 w-4" /> Launch KDS Board ↗
          </a>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('tables')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === 'tables'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <QrCode className="h-4 w-4" /> Table & Counter QRs ({tables.length})
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === 'menu'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Utensils className="h-4 w-4" /> Digital Menu ({menuItems.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === 'settings'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="h-4 w-4" /> Operational Settings
        </button>
      </div>

      {/* TAB 1: TABLES & QR CODES */}
      {activeTab === 'tables' && (
        <div className="space-y-6">
          {/* Counter QR Card */}
          {counterQr && (
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-6 backdrop-blur-md">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Walk-in Counter QR Code</h3>
                  <p className="text-xs text-slate-400 max-w-md">
                    Display this QR at your checkout counter. Orders generate atomic tokens (T-001, T-002) for pickup queues.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs font-mono text-indigo-400">
                    <span>{counterQr.full_url}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={counterQr.qr_url} alt="Counter QR" className="h-28 w-28 rounded-xl bg-white p-2 shadow-lg" />
                  <a
                    href={counterQr.qr_url}
                    download={`counter_qr_${fbo.slug}.png`}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                  >
                    <Download className="h-4 w-4" /> Download
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Batch Generate Form */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
            <h3 className="text-lg font-bold text-white mb-2">Batch Table Generator</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter the total number of tables in your dining area to auto-create HMAC signed QR codes.
            </p>
            <div className="flex items-center gap-3 max-w-xs">
              <input
                type="number"
                min={1}
                max={200}
                value={tableCountInput}
                onChange={(e) => setTableCountInput(Number(e.target.value))}
                className="w-24 rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-center text-sm font-mono text-white focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={handleGenerateTables}
                disabled={generatingTables}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {generatingTables ? 'Generating...' : 'Generate QRs'}
              </button>
            </div>
          </div>

          {/* Table Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tables.map((table) => (
              <div key={table.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col justify-between shadow-lg">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                    <span className="font-bold text-white text-lg">Table {table.table_number}</span>
                    <button
                      onClick={() => handleRotateToken(table.id)}
                      title="Rotate HMAC Security Token"
                      className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-800/60 px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:text-indigo-400"
                    >
                      <RotateCw className="h-3 w-3" /> Rotate Token
                    </button>
                  </div>
                  <div className="flex items-center justify-center py-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={table.qr_url} alt={`Table ${table.table_number}`} className="h-36 w-36 rounded-xl bg-white p-2 shadow-inner" />
                  </div>
                  <p className="mt-2 text-center text-[10px] font-mono text-slate-500 truncate">{table.full_url}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <a
                    href={table.qr_url}
                    download={`table_${table.table_number}_${fbo.slug}.png`}
                    className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-slate-800 bg-slate-800 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                  >
                    <Download className="h-3.5 w-3.5" /> Save
                  </a>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: DIGITAL MENU */}
      {activeTab === 'menu' && (
        <div className="space-y-6">
          {/* Category Adder */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
            <h3 className="text-lg font-bold text-white mb-2">Create Menu Category</h3>
            <div className="flex items-center gap-3 max-w-md">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Starters, Beverages, Desserts"
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={handleAddCategory}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Add Category
              </button>
            </div>
          </div>

          {/* Add Item Form */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
            <h3 className="text-lg font-bold text-white mb-4">Add Dish / Menu Item</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Dish Name"
                className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
              <input
                type="number"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                placeholder="Price (₹)"
                className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
              <select
                value={newItemCategoryId}
                onChange={(e) => setNewItemCategoryId(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">No Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newItemVeg}
                    onChange={(e) => setNewItemVeg(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0"
                  />
                  Pure Veg
                </label>
                <button
                  onClick={handleAddMenuItem}
                  disabled={addingItem}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {addingItem ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </div>
          </div>

          {/* Menu Items List */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
            <h3 className="text-lg font-bold text-white mb-4">Dish Inventory</h3>
            <div className="divide-y divide-slate-800">
              {menuItems.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">No items added yet</p>
              ) : (
                menuItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className={`h-3 w-3 rounded-full border ${item.is_veg ? 'border-emerald-500 bg-emerald-500/20' : 'border-rose-500 bg-rose-500/20'}`} />
                      <div>
                        <p className="text-sm font-semibold text-white">{item.name}</p>
                        <p className="text-xs text-slate-400">₹{item.price}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleAvailable(item)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        item.is_available
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {item.is_available ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                      {item.is_available ? 'Available' : 'Out of Stock'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OPERATIONAL SETTINGS */}
      {activeTab === 'settings' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6 backdrop-blur-md max-w-2xl">
          <h3 className="text-lg font-bold text-white">Ordering System Settings</h3>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Operational Mode</label>
            <div className="grid grid-cols-3 gap-3">
              {(['dine_in', 'counter_qsr', 'hybrid'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={async () => {
                    await fetch('/api/fbo/qr-settings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ operational_mode: mode }),
                    })
                    loadFboData()
                  }}
                  className={`rounded-xl border p-3 text-xs font-semibold capitalize transition ${
                    fbo.operational_mode === mode
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {mode.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Merchant Direct UPI ID (Soundbox)</label>
            <div className="flex gap-2">
              <input
                type="text"
                defaultValue={fbo.merchant_upi_id || ''}
                placeholder="e.g. restaurant@upi"
                onBlur={async (e) => {
                  await fetch('/api/fbo/qr-settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ merchant_upi_id: e.target.value }),
                  })
                  loadFboData()
                }}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Direct soundbox orders require staff manual confirmation on KDS board.</p>
          </div>
        </div>
      )}
    </div>
  )
}
