import type { MenuSnapshot } from './adminStore'
import type { MenuItem } from '../data/menu'

export interface LocalDraftPreview {
  menu: MenuSnapshot
  specials: {
    eyebrow: string
    title: string
    items: MenuItem[]
    entries: Array<{ id: string; order: number; kind: 'reference' | 'temporary'; item: MenuItem }>
  }
  summary: {
    categoryCount: number
    menuItemCount: number
    realSpecialReferences: number
    temporarySpecialEntries: number
    imageAssetCount: number
    publishedDocumentCount: number
  }
}

export function isLocalDraftPreviewRequested() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('sanityPreview') === 'drafts'
}

export async function fetchLocalDraftPreview(): Promise<LocalDraftPreview> {
  const response = await fetch('/api/preview/sanity-drafts', {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  const payload = await response.json().catch(() => ({})) as LocalDraftPreview & { error?: string }
  if (!response.ok) throw new Error(payload.error || 'Sanity draft preview is unavailable.')
  return payload
}
