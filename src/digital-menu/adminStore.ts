import { useEffect, useState } from 'react'
import { menuItems, type MenuItem } from '../data/menu'

export interface MenuOverrides {
  prices: Record<string, number>
  soldOut: Record<string, boolean>
  badges: Record<string, string> // 'bestseller' | 'chef-special' | 'new' | ''
  descriptions: Record<string, string>
}

const STORAGE_KEY = 'cafein_digital_menu_overrides_v1'
const PIN_KEY = 'cafein_admin_pin_v1'
const DEFAULT_PIN = '1234'

function loadOverrides(): MenuOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (e) {
    console.error('Failed to load menu overrides', e)
  }
  return { prices: {}, soldOut: {}, badges: {}, descriptions: {} }
}

function saveOverrides(overrides: MenuOverrides) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
    window.dispatchEvent(new CustomEvent('cafein_menu_updated', { detail: overrides }))
  } catch (e) {
    console.error('Failed to save menu overrides', e)
  }
}

export function getAdminPin(): string {
  try {
    return localStorage.getItem(PIN_KEY) || DEFAULT_PIN
  } catch {
    return DEFAULT_PIN
  }
}

export function setAdminPin(pin: string) {
  try {
    localStorage.setItem(PIN_KEY, pin)
  } catch (e) {
    console.error('Failed to set admin pin', e)
  }
}

export interface EnhancedMenuItem extends MenuItem {
  isSoldOut: boolean
  badge?: string
}

export function getProcessedMenuItems(overrides: MenuOverrides): EnhancedMenuItem[] {
  // Pre-seed some natural bestsellers if not overridden
  const defaultBestsellers = new Set([
    'cappuccino',
    'biscoff-latte',
    'vietnamese-iced-coffee',
    'loaded-french-fries',
    'alfredo-penne',
    'biscoff-cheesecake',
    'hot-chocolate',
  ])

  return menuItems.map((item) => {
    const customPrice = overrides.prices[item.id]
    const customSoldOut = overrides.soldOut[item.id] ?? false
    const customBadge = overrides.badges[item.id] !== undefined 
      ? overrides.badges[item.id] 
      : defaultBestsellers.has(item.id) 
        ? 'Bestseller' 
        : undefined
    const customDesc = overrides.descriptions[item.id] ?? item.description

    return {
      ...item,
      price: customPrice ?? item.price,
      description: customDesc,
      isSoldOut: customSoldOut,
      badge: customBadge || undefined,
    }
  })
}

/** Hook providing live reactive menu items reflecting admin edits */
export function useLiveMenu() {
  const [overrides, setOverrides] = useState<MenuOverrides>(loadOverrides)

  useEffect(() => {
    const handleUpdate = () => {
      setOverrides(loadOverrides())
    }
    window.addEventListener('cafein_menu_updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener('cafein_menu_updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  const updatePrice = (id: string, price: number) => {
    const updated = {
      ...overrides,
      prices: { ...overrides.prices, [id]: price },
    }
    setOverrides(updated)
    saveOverrides(updated)
  }

  const toggleSoldOut = (id: string) => {
    const current = overrides.soldOut[id] ?? false
    const updated = {
      ...overrides,
      soldOut: { ...overrides.soldOut, [id]: !current },
    }
    setOverrides(updated)
    saveOverrides(updated)
  }

  const updateBadge = (id: string, badge: string) => {
    const updated = {
      ...overrides,
      badges: { ...overrides.badges, [id]: badge },
    }
    setOverrides(updated)
    saveOverrides(updated)
  }

  const updateDescription = (id: string, description: string) => {
    const updated = {
      ...overrides,
      descriptions: { ...overrides.descriptions, [id]: description },
    }
    setOverrides(updated)
    saveOverrides(updated)
  }

  const resetToDefault = () => {
    const empty: MenuOverrides = { prices: {}, soldOut: {}, badges: {}, descriptions: {} }
    setOverrides(empty)
    saveOverrides(empty)
  }

  const exportConfig = () => JSON.stringify(overrides, null, 2)

  const importConfig = (json: string): boolean => {
    try {
      const parsed = JSON.parse(json)
      if (typeof parsed === 'object' && parsed !== null) {
        setOverrides(parsed)
        saveOverrides(parsed)
        return true
      }
    } catch (e) {
      console.error('Failed to import config JSON', e)
    }
    return false
  }

  const items = getProcessedMenuItems(overrides)

  return {
    items,
    overrides,
    updatePrice,
    toggleSoldOut,
    updateBadge,
    updateDescription,
    resetToDefault,
    exportConfig,
    importConfig,
  }
}
