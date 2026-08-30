'use client'

import { useEffect, useRef } from 'react'
import { openDB, type IDBPDatabase } from 'idb'
import type { Order } from '@/types/database'

const DB_NAME = 'mellod-kds'
const STORE_NAME = 'pending-orders'

let db: IDBPDatabase | null = null

async function getDB() {
  if (!db) {
    db = await openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      },
    })
  }
  return db
}

export async function cacheOrder(order: Order) {
  const database = await getDB()
  await database.put(STORE_NAME, order)
}

export async function getCachedOrders(): Promise<Order[]> {
  const database = await getDB()
  return database.getAll(STORE_NAME)
}

export async function removeCachedOrder(id: string) {
  const database = await getDB()
  await database.delete(STORE_NAME, id)
}

/**
 * Web Audio API chime — no external files, works as PWA
 */
export function playOrderChime() {
  try {
    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return

    const ctx = new AudioCtx()
    const notes = [523.25, 659.25, 783.99, 1046.50] // C5 E5 G5 C6
    let time = ctx.currentTime

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0, time)
      gain.gain.linearRampToValueAtTime(0.3, time + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4)
      osc.start(time)
      osc.stop(time + 0.4)
      time += i === notes.length - 1 ? 0 : 0.18
    })
  } catch {
    // Audio not available
  }
}

/**
 * Hook: WebSocket heartbeat monitor with connection lost banner trigger
 */
export function useRealtimeHeartbeat(
  onDisconnect: () => void,
  onReconnect: () => void,
  intervalMs = 15000
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isConnectedRef = useRef(true)

  useEffect(() => {
    const check = () => {
      if (!navigator.onLine) {
        if (isConnectedRef.current) {
          isConnectedRef.current = false
          onDisconnect()
        }
      } else {
        if (!isConnectedRef.current) {
          isConnectedRef.current = true
          onReconnect()
        }
      }
    }

    window.addEventListener('online', () => {
      isConnectedRef.current = true
      onReconnect()
    })
    window.addEventListener('offline', () => {
      isConnectedRef.current = false
      onDisconnect()
    })

    intervalRef.current = setInterval(check, intervalMs)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [onDisconnect, onReconnect, intervalMs])
}
