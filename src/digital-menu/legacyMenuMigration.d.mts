import type { MenuCategory } from '../data/menu'
import type { EnhancedMenuItem, MenuBackup } from './adminStore'

interface LegacyMenuSnapshot {
  revision: number
  categories: MenuCategory[]
  items: EnhancedMenuItem[]
}

export const LEGACY_MENU_OVERRIDES_KEY: string
export function hasLegacyMenuOverrides(): boolean
export function clearLegacyAdminPin(): void
export function convertLegacyMenuOverrides(raw: string, snapshot: LegacyMenuSnapshot): MenuBackup
export function getLegacyMenuBackup(snapshot: LegacyMenuSnapshot): MenuBackup | null
export function clearLegacyMenuOverrides(): boolean
