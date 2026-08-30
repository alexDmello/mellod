'use client'

import { useState, useEffect, useCallback } from 'react'
import { QrCode, ToggleLeft, ToggleRight, Building2, Search, CheckCircle2, AlertCircle } from 'lucide-react'

interface FboAdminRow {
  id: string
  business_name: string
  contact_person: string | null
  phone: string | null
  slug: string | null
  qr_enabled_by_admin: boolean
  qr_opted_in_by_fbo: boolean
}

export default function AdminQROrderingManagementPage() {
  const [fbos, setFbos] = useState<FboAdminRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [migrationNeeded, setMigrationNeeded] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadFbos = useCallback(async () => {
    try {
      setErrorMsg(null)
      const res = await fetch('/api/admin/qr-fbos')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch FBOs')
      }

      setFbos(data.fbos || [])
      setMigrationNeeded(!!data.migration_needed)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error fetching FBO list'
      console.error(e)
      setErrorMsg(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFbos()
  }, [loadFbos])

  const handleToggleQR = async (fbo: FboAdminRow) => {
    setTogglingId(fbo.id)
    const newStatus = !fbo.qr_enabled_by_admin

    try {
      const res = await fetch(`/api/admin/fbos/${fbo.id}/qr-feature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newStatus }),
      })

      if (res.ok) {
        await loadFbos()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update QR feature status')
      }
    } catch {
      alert('Error updating QR feature status')
    } finally {
      setTogglingId(null)
    }
  }

  const filteredFbos = fbos.filter(
    (f) =>
      f.business_name.toLowerCase().includes(search.toLowerCase()) ||
      (f.contact_person && f.contact_person.toLowerCase().includes(search.toLowerCase())) ||
      (f.slug && f.slug.toLowerCase().includes(search.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="bg-white/95 backdrop-blur-2xl p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-700/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                QR Ordering Feature Provisioning
              </h1>
              <p className="text-xs text-slate-500 font-semibold">
                Enable or disable the Multi-Tenant QR Ordering capability for restaurant FBO outlets
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search FBO or slug..."
            className="w-full pl-9 pr-4 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-slate-900 outline-none"
          />
        </div>
      </div>

      {migrationNeeded && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-extrabold text-amber-900">Database Migration Recommended</p>
            <p className="mt-0.5 text-amber-800">
              The QR Ordering columns (`qr_enabled_by_admin`) do not exist in your Supabase `fbos` table yet. Please run <code className="bg-amber-100 font-mono px-1 py-0.5 rounded">supabase/qr_integration_migration.sql</code> in your Supabase SQL Editor.
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-900 shadow-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-extrabold text-rose-900">Error Loading FBO List</p>
            <p className="mt-0.5 text-rose-800">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* FBO Directory Table */}
      <div className="bg-white/95 backdrop-blur-2xl rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-black uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4">FBO Restaurant</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">QR Slug</th>
                <th className="px-6 py-4">FBO Opt-in</th>
                <th className="px-6 py-4 text-right">Super Admin Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredFbos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-bold">
                    No FBO records found matching your search.
                  </td>
                </tr>
              ) : (
                filteredFbos.map((fbo) => (
                  <tr key={fbo.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm">{fbo.business_name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">ID: {fbo.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900 font-bold">{fbo.contact_person || 'N/A'}</p>
                      <p className="text-slate-500 text-[11px]">{fbo.phone || 'No phone'}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">
                      {fbo.slug ? (
                        <span className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-indigo-700 font-bold">
                          /qr/{fbo.slug}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {fbo.qr_opted_in_by_fbo ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Opted In
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-1 text-[11px] font-bold">
                          <AlertCircle className="w-3.5 h-3.5" /> Not Opted In
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleQR(fbo)}
                        disabled={togglingId === fbo.id}
                        className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black transition shadow-sm ${
                          fbo.qr_enabled_by_admin
                            ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        } disabled:opacity-50`}
                      >
                        {fbo.qr_enabled_by_admin ? (
                          <>
                            <ToggleRight className="w-4 h-4" /> Enabled
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4" /> Disabled
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
