import { useEffect, useState } from 'react'

export interface TrayItem {
  id: string
  quantity: number
}

const TRAY_STORAGE_KEY = 'cafein_customer_order_tray_v1'

function loadTray(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(TRAY_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Failed to load tray', e)
  }
  return {}
}

function saveTray(tray: Record<string, number>) {
  try {
    sessionStorage.setItem(TRAY_STORAGE_KEY, JSON.stringify(tray))
    window.dispatchEvent(new CustomEvent('cafein_tray_updated'))
  } catch (e) {
    console.error('Failed to save tray', e)
  }
}

export function useCustomerTray() {
  const [tray, setTray] = useState<Record<string, number>>(loadTray)

  useEffect(() => {
    const handler = () => setTray(loadTray())
    window.addEventListener('cafein_tray_updated', handler)
    return () => window.removeEventListener('cafein_tray_updated', handler)
  }, [])

  const addItem = (id: string) => {
    const current = tray[id] ?? 0
    const updated = { ...tray, [id]: current + 1 }
    setTray(updated)
    saveTray(updated)
  }

  const removeItem = (id: string) => {
    const current = tray[id] ?? 0
    if (current <= 1) {
      const updated = { ...tray }
      delete updated[id]
      setTray(updated)
      saveTray(updated)
    } else {
      const updated = { ...tray, [id]: current - 1 }
      setTray(updated)
      saveTray(updated)
    }
  }

  const clearTray = () => {
    setTray({})
    saveTray({})
  }

  const totalCount = Object.values(tray).reduce((a, b) => a + b, 0)

  return {
    tray,
    addItem,
    removeItem,
    clearTray,
    totalCount,
  }
}
