import { useCallback, useEffect, useRef, useState } from 'react'
import type { ImageAsset } from '../data/images'
import type { MenuCategory, MenuItem } from '../data/menu'
import { fetchLocalDraftPreview } from './sanityPreview'

export interface EnhancedMenuItem extends MenuItem {
  isSoldOut: boolean
  badge?: string
}

export interface MenuSnapshot {
  schemaVersion: 1
  revision: number
  categories: MenuCategory[]
  items: EnhancedMenuItem[]
}

export interface MenuBackup extends Omit<MenuSnapshot, 'schemaVersion'> {
  schemaVersion: 1
}

export interface ImportPreview {
  baseRevision: number
  added: string[]
  updated: string[]
  removed: string[]
  itemCount: number
}

const MENU_UPDATED_EVENT = 'cafein_menu_updated'
let csrfToken: string | null = null

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin', ...init })
  const data = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.')
  return data
}

async function getCsrfToken() {
  if (csrfToken) return csrfToken
  const session = await requestJson<{ authenticated: boolean; csrfToken?: string }>('/api/admin/session')
  if (!session.authenticated || !session.csrfToken) throw new Error('Your manager session has expired. Sign in again.')
  csrfToken = session.csrfToken
  return csrfToken
}

async function adminRequest<T>(url: string, init: RequestInit = {}) {
  const token = await getCsrfToken()
  return requestJson<T>(url, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
      'X-CSRF-Token': token,
    },
  })
}

export async function uploadMenuPhoto(file: File, onProgress: (progress: number) => void): Promise<ImageAsset> {
  const token = await getCsrfToken()
  const contentType = file.type || (/\.png$/i.test(file.name) ? 'image/png' : /\.jpe?g$/i.test(file.name) ? 'image/jpeg' : '')
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', '/api/admin/images')
    request.withCredentials = true
    request.setRequestHeader('X-CSRF-Token', token)
    request.setRequestHeader('Content-Type', contentType)
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    })
    request.addEventListener('load', () => {
      let result: { image?: ImageAsset; error?: string } = {}
      try { result = JSON.parse(request.responseText || '{}') as typeof result } catch { /* Use the request status message below. */ }
      if (request.status < 200 || request.status >= 300 || !result.image) {
        reject(new Error(result.error || 'The photo upload could not be completed.'))
        return
      }
      onProgress(100)
      resolve(result.image)
    })
    request.addEventListener('error', () => reject(new Error('The photo upload was interrupted. Check your connection and try again.')))
    request.addEventListener('abort', () => reject(new Error('The photo upload was cancelled.')))
    request.send(file)
  })
}

export async function discardMenuPhoto(src: string) {
  return adminRequest<{ deleted: boolean }>('/api/admin/images', {
    method: 'DELETE',
    body: JSON.stringify({ src }),
  })
}

function announceMenuChange(snapshot: MenuSnapshot) {
  window.dispatchEvent(new CustomEvent<MenuSnapshot>(MENU_UPDATED_EVENT, { detail: snapshot }))
}

export async function loginAdmin(password: string) {
  const result = await requestJson<{ authenticated: boolean; csrfToken: string }>('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  csrfToken = result.csrfToken
  const snapshot = await requestJson<MenuSnapshot>('/api/admin/menu')
  announceMenuChange(snapshot)
  return snapshot
}

export async function logoutAdmin() {
  await adminRequest('/api/admin/logout', { method: 'POST' })
  csrfToken = null
}

export async function checkAdminSession() {
  const session = await requestJson<{ authenticated: boolean; csrfToken?: string }>('/api/admin/session')
  csrfToken = session.authenticated ? session.csrfToken || null : null
  if (!session.authenticated) return null
  const snapshot = await requestJson<MenuSnapshot>('/api/admin/menu')
  announceMenuChange(snapshot)
  return snapshot
}

export function useLiveMenu(options: { forceLegacy?: boolean; draftPreview?: boolean } = {}) {
  const [items, setItems] = useState<EnhancedMenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dataSource, setDataSource] = useState<'sanity' | 'sanity-preview' | 'legacy'>('legacy')
  const [previewError, setPreviewError] = useState('')
  const [previewSummary, setPreviewSummary] = useState<{ categoryCount: number; menuItemCount: number; realSpecialReferences: number; temporarySpecialEntries: number; imageAssetCount: number; publishedDocumentCount: number } | null>(null)
  const dataSourceRef = useRef<'sanity' | 'sanity-preview' | 'legacy'>('legacy')
  const revisionRef = useRef(0)
  const hasSnapshotRef = useRef(false)
  const refreshSequenceRef = useRef(0)

  const acceptSnapshot = useCallback((snapshot: MenuSnapshot, source: 'sanity' | 'sanity-preview' | 'legacy' = 'legacy') => {
    const sameSource = dataSourceRef.current === source
    dataSourceRef.current = source
    setDataSource(source)
    if (hasSnapshotRef.current && sameSource && revisionRef.current === snapshot.revision) {
      setError('')
      setLoading(false)
      return
    }
    setItems(snapshot.items)
    setCategories(snapshot.categories)
    setRevision(snapshot.revision)
    revisionRef.current = snapshot.revision
    hasSnapshotRef.current = true
    setError('')
    if (source === 'sanity-preview') setPreviewError('')
    setLoading(false)
  }, [])

  const refresh = useCallback(async (): Promise<MenuSnapshot | null> => {
    const requestSequence = ++refreshSequenceRef.current
    try {
      if (options.draftPreview && !options.forceLegacy) {
        const preview = await fetchLocalDraftPreview()
        if (requestSequence !== refreshSequenceRef.current) return null
        setPreviewSummary(preview.summary)
        setPreviewError('')
        acceptSnapshot(preview.menu, 'sanity-preview')
        return preview.menu
      }
    } catch (cause) {
      setPreviewError(cause instanceof Error ? cause.message : 'Sanity draft preview is unavailable.')
      // Preview failures continue through the existing published Sanity and JSON/API fallback.
    }
    try {
      if (!options.forceLegacy) {
        const { fetchPublishedMenu } = await import('./sanityContent')
        const published = await fetchPublishedMenu()
        if (requestSequence !== refreshSequenceRef.current) return null
        if (published) {
          acceptSnapshot(published, 'sanity')
          return published
        }
      }
    } catch {
      // Keep the existing published-site fallback available while Sanity is empty or unavailable.
    }
    try {
      const snapshot = await requestJson<Omit<MenuSnapshot, 'schemaVersion'>>('/api/menu')
      const current = { schemaVersion: 1 as const, ...snapshot }
      if (requestSequence !== refreshSequenceRef.current) return null
      acceptSnapshot(current)
      return current
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The menu could not be loaded.')
      setLoading(false)
      return null
    }
  }, [acceptSnapshot, options.draftPreview, options.forceLegacy])

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => { void refresh() }, 0)
    const pollTimer = window.setInterval(() => { void refresh() }, 30_000)
    const handleMenuChange = (event: Event) => {
      if (!options.forceLegacy && dataSourceRef.current === 'sanity') return
      const detail = (event as CustomEvent<MenuSnapshot>).detail
      if (detail) acceptSnapshot(detail)
      else void refresh()
    }
    const handleFocus = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener(MENU_UPDATED_EVENT, handleMenuChange)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)
    return () => {
      window.clearTimeout(refreshTimer)
      window.clearInterval(pollTimer)
      window.removeEventListener(MENU_UPDATED_EVENT, handleMenuChange)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [acceptSnapshot, options.forceLegacy, refresh])

  const saveSnapshot = useCallback((snapshot: MenuSnapshot) => {
    acceptSnapshot(snapshot)
    announceMenuChange(snapshot)
  }, [acceptSnapshot])

  const saveItem = useCallback(async (item: EnhancedMenuItem) => {
    const isNew = !items.some((existing) => existing.id === item.id)
    const result = await adminRequest<{ revision: number }>('/api/admin/menu' + (isNew ? '' : `/${encodeURIComponent(item.id)}`), {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'If-Match': `"${revisionRef.current}"` },
      body: JSON.stringify(item),
    })
    const snapshot = await requestJson<MenuSnapshot>('/api/admin/menu')
    if (snapshot.revision !== result.revision) throw new Error('The menu changed while your save was completing. Reload before continuing.')
    saveSnapshot(snapshot)
    return snapshot.items.find((entry) => entry.id === item.id)!
  }, [items, saveSnapshot])

  const deleteItem = useCallback(async (id: string) => {
    const result = await adminRequest<{ revision: number }>(`/api/admin/menu/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'If-Match': `"${revisionRef.current}"` },
    })
    const snapshot = await requestJson<MenuSnapshot>('/api/admin/menu')
    if (snapshot.revision !== result.revision) throw new Error('The menu changed while your save was completing. Reload before continuing.')
    saveSnapshot(snapshot)
  }, [saveSnapshot])

  const exportMenu = useCallback(async () => adminRequest<MenuBackup>('/api/admin/export'), [])

  const previewImport = useCallback(async (backup: MenuBackup) => adminRequest<ImportPreview>('/api/admin/import/preview', {
    method: 'POST',
    body: JSON.stringify(backup),
  }), [])

  const applyImport = useCallback(async (backup: MenuBackup, expectedRevision: number) => {
    const result = await adminRequest<{ revision: number }>('/api/admin/import/apply', {
      method: 'POST',
      headers: { 'If-Match': `"${expectedRevision}"` },
      body: JSON.stringify({ backup, confirmReplace: true }),
    })
    const snapshot = await requestJson<MenuSnapshot>('/api/admin/menu')
    if (snapshot.revision !== result.revision) throw new Error('The menu changed while your import was completing. Reload before continuing.')
    saveSnapshot(snapshot)
    return snapshot
  }, [saveSnapshot])

  return { items, categories, revision, loading, error, dataSource, previewError, previewSummary, refresh, saveItem, deleteItem, exportMenu, previewImport, applyImport }
}
