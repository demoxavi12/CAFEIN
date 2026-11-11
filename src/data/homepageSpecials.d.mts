import type { MenuItem } from './menu'

export const homepageSpecials: readonly { key: string; menuItemId: string }[]

export type HomepageSpecialCard = {
  id: string
  menuItem: MenuItem & {
    isSoldOut?: boolean
    isArchived?: boolean
    badge?: string
  }
}

export function resolveHomepageSpecials<T extends MenuItem & {
  isSoldOut?: boolean
  isArchived?: boolean
  badge?: string
}>(items: readonly T[]): Array<{ id: string; menuItem: T }>
