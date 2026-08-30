import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { Order } from '@/types/database'

interface MellodKDSDb extends DBSchema {
  orders: {
    key: string
    value: Order
    indexes: { 'by-status': string; 'by-created': string }
  }
  pendingSync: {
    key: string
    value: { id: string; action: string; payload: unknown; timestamp: number }
  }
}

const DB_NAME = 'mellod-kds-db'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<MellodKDSDb>> | null = null

function getDB() {
  if (typeof window === 'undefined') return null
  if (!dbPromise) {
    dbPromise = openDB<MellodKDSDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const orderStore = db.createObjectStore('orders', { keyPath: 'id' })
        orderStore.createIndex('by-status', 'status')
        orderStore.createIndex('by-created', 'created_at')

        db.createObjectStore('pendingSync', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

/** Cache an order locally in IndexedDB */
export async function cacheOrder(order: Order): Promise<void> {
  const db = await getDB()
  if (!db) return
  await db.put('orders', order)
}

/** Cache multiple orders */
export async function cacheOrders(orders: Order[]): Promise<void> {
  const db = await getDB()
  if (!db) return
  const tx = db.transaction('orders', 'readwrite')
  await Promise.all(orders.map((order) => tx.store.put(order)))
  await tx.done
}

/** Get all cached orders */
export async function getCachedOrders(): Promise<Order[]> {
  const db = await getDB()
  if (!db) return []
  return db.getAll('orders')
}

// ── Audio Chime Player (Web Audio API) ──────────────────────────────────────
class OrderChimePlayer {
  private ctx: AudioContext | null = null
  private unlocked = false

  public unlock() {
    if (this.unlocked || typeof window === 'undefined') return
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new AudioCtx()
      if (this.ctx.state === 'suspended') {
        this.ctx.resume()
      }
      this.unlocked = true
    } catch {
      // AudioContext not supported
    }
  }

  public playNewOrderChime() {
    if (typeof window === 'undefined') return
    if (!this.ctx || !this.unlocked) {
      this.unlock()
    }
    if (!this.ctx) return

    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume()
      }

      const now = this.ctx.currentTime

      // Two-tone chime (E5 -> G5)
      const osc1 = this.ctx.createOscillator()
      const osc2 = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc1.type = 'sine'
      osc2.type = 'sine'

      osc1.frequency.setValueAtTime(659.25, now) // E5
      osc2.frequency.setValueAtTime(783.99, now + 0.15) // G5

      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.3, now + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(this.ctx.destination)

      osc1.start(now)
      osc1.stop(now + 0.15)

      osc2.start(now + 0.15)
      osc2.stop(now + 0.6)
    } catch (e) {
      console.warn('Could not play chime audio:', e)
    }
  }
}

export const chimePlayer = new OrderChimePlayer()
