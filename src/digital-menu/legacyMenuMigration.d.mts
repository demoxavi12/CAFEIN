import type { MenuCategory } from '../data/menu'
import type { EnhancedMenuItem, MenuBackup } from './adminStore'

interface LegacyMenuSnapshot {
  revision: number
  categories: MenuCategory[]
  items: EnhancedMenuItem[]
}

export const LEGACY_MENU_OVERRIDES_KEY: string
export interface LegacyRecoveryRecord { key: string; field: string; label: string; id: string; name: string; value: unknown; currentValue?: unknown; status: 'valid' | 'obsolete' | 'invalid' | 'archived'; reason: string }
export interface LegacyRecoveryIssue { key: string; field: string; id: string; reason: string }
export interface LegacyMenuRecovery { revision: number; records: LegacyRecoveryRecord[]; malformed: LegacyRecoveryIssue[]; total: number }
export function hasLegacyMenuOverrides(): boolean
export function clearLegacyAdminPin(): void
export function inspectLegacyMenuOverrides(raw: string, snapshot: LegacyMenuSnapshot): LegacyMenuRecovery
export function getLegacyMenuRecovery(snapshot: LegacyMenuSnapshot): LegacyMenuRecovery | null
export function buildLegacyRecoveryBackup(snapshot: LegacyMenuSnapshot, recovery: LegacyMenuRecovery, selectedKeys: string[]): MenuBackup
export function buildLegacyRecoveryItems(snapshot: LegacyMenuSnapshot, recovery: LegacyMenuRecovery, selectedKeys: string[]): EnhancedMenuItem[]
export function removeLegacyOverrideRecords(records: LegacyRecoveryRecord[], options?: { onlyIfUnchanged?: boolean }): boolean
export function discardMalformedLegacyOverride(issue: LegacyRecoveryIssue): boolean
export function convertLegacyMenuOverrides(raw: string, snapshot: LegacyMenuSnapshot): MenuBackup
export function getLegacyMenuBackup(snapshot: LegacyMenuSnapshot): MenuBackup | null
export function clearLegacyMenuOverrides(): boolean
