import { useEffect, useMemo, useRef, useState } from 'react'
import type { ImageAsset } from '../data/images'
import { menuItems as canonicalMenuItems, type MenuCategory } from '../data/menu'
import { getCategoryForMenuSection, getMenuSectionMappings, type MenuSectionMapping } from '../../shared/menu-taxonomy.mjs'
import {
  AdminApiError,
  checkAdminSession,
  discardMenuPhoto,
  loginAdmin,
  logoutAdmin,
  publishApprovedMenu,
  uploadMenuPhoto,
  useLiveMenu,
  type EnhancedMenuItem,
  type ImportPreview,
  type MenuBackup,
} from './adminStore'
import { clearLegacyAdminPin, hasLegacyMenuOverrides, getLegacyMenuRecovery, buildLegacyRecoveryItems, removeLegacyOverrideRecords, discardMalformedLegacyOverride, type LegacyMenuRecovery, type LegacyRecoveryRecord, type LegacyRecoveryIssue } from './legacyMenuMigration.mjs'

interface Props {
  isOpen: boolean
  onClose: () => void
}

interface ItemEditorProps {
  item: EnhancedMenuItem
  categories: MenuCategory[]
  sections: MenuSectionMapping[]
  conflict: boolean
  managerBusy: boolean
  onSave: (item: EnhancedMenuItem) => Promise<EnhancedMenuItem>
  onArchive: (item: EnhancedMenuItem) => Promise<void>
  onRestore: (item: EnhancedMenuItem) => Promise<void>
}

function PhotoUploadField({
  value,
  original,
  onChange,
  onUploadingChange,
}: {
  value?: ImageAsset
  original?: ImageAsset
  onChange: (image: ImageAsset | undefined) => void
  onUploadingChange?: (uploading: boolean) => void
}) {
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState('')
  const pendingUpload = useRef<string | null>(null)
  const mounted = useRef(false)

  useEffect(() => () => {
    if (localPreview) URL.revokeObjectURL(localPreview)
  }, [localPreview])
  useEffect(() => () => {
    if (pendingUpload.current) void discardMenuPhoto(pendingUpload.current).catch(() => undefined)
  }, [])
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const selectFile = async (file?: File) => {
    if (!file) return
    const contentType = file.type || (/\.png$/i.test(file.name) ? 'image/png' : /\.jpe?g$/i.test(file.name) ? 'image/jpeg' : '')
    if (!['image/jpeg', 'image/png'].includes(contentType)) {
      setUploadError('Choose a JPEG or PNG image.')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setUploadError('Choose an image smaller than 4 MB for secure serverless upload.')
      return
    }
    if (localPreview) URL.revokeObjectURL(localPreview)
    setLocalPreview(URL.createObjectURL(file))
    setUploadError('')
    setProgress(0)
    onUploadingChange?.(true)
    const previousUpload = pendingUpload.current
    pendingUpload.current = null
    if (previousUpload) void discardMenuPhoto(previousUpload).catch(() => undefined)
    try {
      const image = await uploadMenuPhoto(file, (percentage) => { if (mounted.current) setProgress(percentage) })
      if (!mounted.current) {
        void discardMenuPhoto(image.src).catch(() => undefined)
        return
      }
      pendingUpload.current = image.src
      onChange(image)
      setLocalPreview(null)
      setUploadError('')
    } catch (cause) {
      if (!mounted.current) return
      setUploadError(cause instanceof Error ? cause.message : 'The photo could not be uploaded.')
    } finally {
      if (mounted.current) {
        setProgress(null)
        onUploadingChange?.(false)
      }
    }
  }

  const remove = () => {
    const uploaded = pendingUpload.current
    pendingUpload.current = null
    if (uploaded) void discardMenuPhoto(uploaded).catch(() => undefined)
    if (localPreview) URL.revokeObjectURL(localPreview)
    setLocalPreview(null)
    onChange(undefined)
  }

  const previewSrc = localPreview || value?.src || original?.src
  const showingDifferentPhoto = Boolean(original?.src && (localPreview || (value?.src && original.src !== value.src)))

  return (
    <div className="grid gap-2 rounded-xl border border-ivory/10 bg-black/15 p-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        {showingDifferentPhoto && original && (
          <div className="shrink-0">
            <img src={original.src} alt="Current saved menu photo" width={80} height={64} className="h-16 w-20 rounded-lg border border-ivory/10 object-cover" />
            <span className="mt-1 block text-center text-[9px] text-ivory/45">Current</span>
          </div>
        )}
        {previewSrc ? (
          <div className="shrink-0">
            <img src={previewSrc} alt={value?.alt || 'Menu item photo preview'} width={80} height={64} className="h-16 w-20 rounded-lg border border-ivory/10 object-cover" />
            {(showingDifferentPhoto || original) && <span className="mt-1 block text-center text-[9px] text-ivory/45">{showingDifferentPhoto ? 'Replacement' : 'Current'}</span>}
          </div>
        ) : (
          <div aria-hidden="true" className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-ivory/15 bg-espresso text-[9px] text-ivory/35">No photo</div>
        )}
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-ivory">{showingDifferentPhoto ? 'New photo preview' : value ? 'Current photo' : original ? 'Photo will be removed on save' : 'Optional item photo'}</p>
          {showingDifferentPhoto && <p className="mt-0.5 text-[10px] text-ivory/50">Current photo remains live until you save.</p>}
          {progress !== null && (
            <div className="mt-2 flex items-center gap-2">
              <div role="progressbar" aria-label="Photo upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-1 w-28 overflow-hidden rounded-full bg-ivory/15"><div className="h-full bg-bronze transition-[width] duration-150 motion-reduce:transition-none" style={{ width: `${progress}%` }} /></div>
              <span aria-live="polite" className="text-xs tabular-nums text-ivory/65">Uploading {progress}%</span>
            </div>
          )}
          {uploadError && <p role="alert" className="mt-1 max-w-xl text-[10px] leading-relaxed text-red-200">{uploadError}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <label className="inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-ivory/20 px-3 text-[10px] text-ivory/80 transition-colors hover:border-bronze/50 hover:text-ivory focus-within:outline focus-within:outline-2 focus-within:outline-bronze">
          {value ? 'Change photo' : 'Add photo'}
          <input type="file" name="menu-photo" accept="image/jpeg,image/png" className="sr-only" disabled={progress !== null} onChange={(event) => { void selectFile(event.currentTarget.files?.[0]); event.currentTarget.value = '' }} />
        </label>
        {original && !value ? <button type="button" onClick={() => onChange(original)} className="min-h-10 rounded-lg px-2 text-[10px] text-ivory/55 hover:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-bronze">Keep current</button> : value ? <button type="button" onClick={remove} disabled={progress !== null} className="min-h-10 rounded-lg px-2 text-[10px] text-ivory/55 hover:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-bronze">Remove</button> : null}
      </div>
    </div>
  )
}

function formatRecoveryValue(record: LegacyRecoveryRecord, value: unknown) {
  if (record.field === 'soldOut') return value ? 'Sold out' : 'Available'
  if (record.field === 'badges') return String(value || 'No badge')
  if (record.field === 'prices') return `₹${String(value)}`
  return String(value || 'No description')
}

function ItemEditor({ item, categories, sections, conflict, managerBusy, onSave, onArchive, onRestore }: ItemEditorProps) {
  const [draft, setDraft] = useState(item)
  const [baseItem, setBaseItem] = useState(item)
  const [externalChange, setExternalChange] = useState(false)
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const isDirty = JSON.stringify(draft) !== JSON.stringify(baseItem)

  if (item !== baseItem) {
    const hasLocalEdits = JSON.stringify(draft) !== JSON.stringify(baseItem)
    setBaseItem(item)
    if (hasLocalEdits) setExternalChange(true)
    else setDraft(item)
  }

  const update = <K extends keyof EnhancedMenuItem>(key: K, value: EnhancedMenuItem[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  return (
    <article className="rounded-2xl border border-ivory/10 bg-ivory/[0.045] p-4 text-xs sm:p-5">
      <div className="mb-4 flex min-w-0 items-center gap-3 border-b border-ivory/10 pb-3">
        <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ivory/10 bg-black/25">
          {item.image?.src ? <img src={item.image.src} alt="" width={80} height={64} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <span className="text-[9px] uppercase tracking-wide text-ivory/40">No photo</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base text-ivory">{item.name}</p>
          <p className="mt-1 truncate text-[10px] text-ivory/55">{categories.find((category) => category.id === item.category)?.label || item.category} · ₹{item.price}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide ${item.isSoldOut ? 'border-red-300/25 bg-red-300/10 text-red-200' : 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'}`}>{item.isSoldOut ? 'Sold out' : 'In stock'}</span>
      </div>
      {(externalChange || conflict) && <p role="status" className="mb-3 rounded-lg border border-amber-200/20 bg-amber-200/[0.07] px-3 py-2 text-[11px] leading-relaxed text-amber-100">This item changed in another view. Your edits are preserved; reload the latest menu before saving.</p>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_minmax(10rem,1fr)]">
        <label className="grid gap-1 text-xs tracking-wide text-ivory/70">
          Item name
          <input value={draft.name} maxLength={80} onChange={(event) => update('name', event.target.value)} className="rounded-lg border border-ivory/15 bg-black/30 px-2.5 py-2 text-sm normal-case tracking-normal text-ivory focus:border-bronze focus:outline-none" />
        </label>
        <label className="grid gap-1 text-xs tracking-wide text-ivory/70">
          Price · ₹
          <input type="number" min="0" max="100000" step="1" value={draft.price} onChange={(event) => update('price', Number(event.target.value))} className="rounded-lg border border-bronze/30 bg-black/30 px-2.5 py-2 text-sm tabular-nums text-bronze focus:border-bronze focus:outline-none" />
        </label>
        <label className="grid gap-1 text-xs tracking-wide text-ivory/70">
          Gourmet section
          <select value={draft.section} required onChange={(event) => {
            const section = event.target.value
            const category = getCategoryForMenuSection(section, sections)
            if (category) setDraft((current) => ({ ...current, section, category: category as EnhancedMenuItem['category'] }))
          }} className="rounded-lg border border-ivory/15 bg-espresso px-2.5 py-2 text-sm normal-case tracking-normal text-ivory focus:border-bronze focus:outline-none">
            {!sections.some((entry) => entry.section === draft.section) && <option value={draft.section}>{draft.section} · choose a configured section</option>}
            {sections.map(({ section }) => <option key={section} value={section}>{section}</option>)}
          </select>
        </label>
      </div>
      <p className="mt-2 text-[10px] text-ivory/50">Parent category: <span className="text-ivory/75">{categories.find((category) => category.id === draft.category)?.label || draft.category}</span> · assigned automatically</p>
      <label className="mt-2 grid gap-1 text-xs tracking-wide text-ivory/70">
        Description
        <textarea value={draft.description || ''} maxLength={500} rows={2} onChange={(event) => update('description', event.target.value)} className="w-full resize-y rounded-lg border border-ivory/15 bg-black/30 p-2.5 text-xs normal-case tracking-normal leading-relaxed text-ivory focus:border-bronze focus:outline-none" />
      </label>
      <div className="mt-3">
        <PhotoUploadField value={draft.image} original={item.image} onChange={(image) => update('image', image ? { ...image, alt: draft.name } : undefined)} onUploadingChange={setPhotoBusy} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ivory/10 pt-3">
        <button type="button" onClick={() => update('isSoldOut', !draft.isSoldOut)} className={`min-h-11 rounded-full border px-3 text-xs font-bold ${draft.isSoldOut ? 'border-red-500/50 bg-red-500/15 text-red-200' : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'}`}>
          {draft.isSoldOut ? 'Sold out' : 'In stock'}
        </button>
        <label className="flex min-h-11 items-center gap-2 text-xs text-ivory/70">
          Badge
          <select value={draft.badge || ''} onChange={(event) => update('badge', event.target.value || undefined)} className="min-h-11 rounded-lg border border-ivory/15 bg-espresso px-2 py-2 text-[10px] text-ivory focus:border-bronze focus:outline-none focus-visible:ring-2 focus-visible:ring-bronze/60">
            <option value="">None</option>
            <option value="Bestseller">Bestseller</option>
            <option value="Chef Special">Chef Special</option>
          </select>
        </label>
        <button type="button" disabled={managerBusy || busy || photoBusy || externalChange || conflict || !isDirty || !getCategoryForMenuSection(draft.section, sections)} onClick={async () => { setBusy(true); try { const saved = await onSave(draft); setDraft(saved); setBaseItem(saved); setExternalChange(false) } catch { /* Parent displays the request error. */ } finally { setBusy(false) } }} className="btn btn-primary ml-auto min-h-11 px-4 text-[10px] disabled:opacity-50">
          {photoBusy ? 'Uploading photo…' : busy ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" disabled={managerBusy || busy || photoBusy || externalChange || conflict} onClick={() => item.isArchived ? void onRestore(item) : void onArchive(item)} className={`min-h-11 rounded-lg border px-3 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-bronze disabled:opacity-50 ${item.isArchived ? 'border-emerald-300/30 text-emerald-200 hover:bg-emerald-300/10' : 'border-amber-200/25 text-amber-100 hover:bg-amber-100/10'}`}>
          {item.isArchived ? 'Restore item' : 'Archive item'}
        </button>
      </div>
    </article>
  )
}

export function DigitalMenuAdminModal({ isOpen, onClose }: Props) {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newSection, setNewSection] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newImage, setNewImage] = useState<ImageAsset | undefined>()
  const [newPhotoBusy, setNewPhotoBusy] = useState(false)
  const [pendingBackup, setPendingBackup] = useState<MenuBackup | null>(null)
  const [pendingPreview, setPendingPreview] = useState<ImportPreview | null>(null)
  const [legacyAvailable, setLegacyAvailable] = useState(false)
  const [legacyRecovery, setLegacyRecovery] = useState<LegacyMenuRecovery | null>(null)
  const [selectedLegacyKeys, setSelectedLegacyKeys] = useState<string[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [revisionConflict, setRevisionConflict] = useState(false)
  const [editorResetVersion, setEditorResetVersion] = useState(0)
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const { items, categories, loading, error, refresh, saveItem, setArchived, exportMenu, previewImport, applyImport } = useLiveMenu({ forceLegacy: true, managerMode: isAuthenticated })
  const sections = useMemo(() => getMenuSectionMappings(canonicalMenuItems, categories), [categories])

  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    const getFocusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
    ) || [])
    getFocusable()[0]?.focus()
    const handleDialogKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
      }
      if (event.key === 'Tab') {
        const elements = getFocusable()
        if (!elements.length) return
        const first = elements[0]
        const last = elements[elements.length - 1]
        if (!dialogRef.current?.contains(document.activeElement)) {
          event.preventDefault()
          first.focus()
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleDialogKey)
    let active = true
    void checkAdminSession().then((snapshot) => {
      if (active && snapshot) {
        setIsAuthenticated(true)
        setLegacyAvailable(hasLegacyMenuOverrides())
        clearLegacyAdminPin()
      }
    }).catch(() => undefined)
    return () => {
      active = false
      document.removeEventListener('keydown', handleDialogKey)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [isOpen])

  const statusItems = useMemo(() => items.filter((item) => Boolean(item.isArchived) === showArchived), [items, showArchived])
  const filteredItems = useMemo(() => statusItems.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    const matchesQuery = `${item.name} ${item.section} ${item.description || ''}`.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesQuery
  }), [statusItems, query, selectedCategory])

  if (!isOpen) return null

  const reportError = (cause: unknown) => {
    setSuccessMsg('')
    setErrorMsg(cause instanceof Error ? cause.message : 'The request could not be completed.')
    if (cause instanceof Error && /authentication required|session has expired/i.test(cause.message)) setIsAuthenticated(false)
  }

  const reportRevisionConflict = () => {
    setSuccessMsg('')
    setRevisionConflict(true)
    setErrorMsg('The shared menu changed after this editor loaded. Your current edits remain on screen; review the conflict and reload only when you are ready to discard them.')
  }

  const handleReloadLatest = async () => {
    if (!window.confirm('Reload the latest manager menu? This will discard unsaved edits in open item forms.')) return
    setBusy(true)
    try {
      const snapshot = await refresh()
      if (!snapshot) throw new Error('The latest manager menu could not be loaded. Your current edits remain on screen.')
      if (legacyRecovery) {
        const updated = getLegacyMenuRecovery(snapshot)
        setLegacyRecovery(updated)
        setSelectedLegacyKeys((keys) => keys.filter((key) => updated?.records.some((record) => record.key === key && record.status === 'valid')))
      }
      if (pendingBackup) {
        const refreshedPreview = await previewImport(pendingBackup)
        setPendingPreview(refreshedPreview)
      }
      setEditorResetVersion((version) => version + 1)
      setRevisionConflict(false)
      setErrorMsg('')
      setSuccessMsg(pendingBackup ? 'Latest menu drafts reloaded. The selected backup preview was checked again against the new revision.' : legacyRecovery ? 'Latest menu loaded. Saved edits were rechecked against the current menu; review the refreshed values before applying.' : 'Latest menu drafts reloaded. Search and category filters were kept in place.')
    } catch (cause) { reportError(cause) }
    finally { setBusy(false) }
  }

  const handleUnlock = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setErrorMsg('')
    try {
      await loginAdmin(password)
      clearLegacyAdminPin()
      setLegacyAvailable(hasLegacyMenuOverrides())
      setPassword('')
      setIsAuthenticated(true)
    } catch (cause) {
      reportError(cause)
    } finally {
      setPassword('')
      setBusy(false)
    }
  }

  const handleSave = async (item: EnhancedMenuItem): Promise<EnhancedMenuItem> => {
    try {
      const saved = await saveItem(item.image ? { ...item, image: { ...item.image, alt: item.name } } : item)
      setErrorMsg('')
      setRevisionConflict(false)
      setSuccessMsg(`${item.name} saved as an unpublished draft.`)
      return saved
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 409) reportRevisionConflict()
      else reportError(cause)
      throw cause
    }
  }

  const handleArchive = async (item: EnhancedMenuItem) => {
    if (!window.confirm(`Archive ${item.name}?\n\nThis item will be hidden from the active customer menu. You can restore it later from Archived Items. It will remain unpublished.`)) return
    setBusy(true)
    try {
      await setArchived(item.id, 'archive')
      setErrorMsg('')
      setRevisionConflict(false)
      setSuccessMsg(`${item.name} archived. It remains available to restore and no content was published.`)
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 409) reportRevisionConflict()
      else reportError(cause)
    } finally { setBusy(false) }
  }

  const handleRestore = async (item: EnhancedMenuItem) => {
    if (!window.confirm(`Restore ${item.name}?\n\nIt will return to ${item.section} under ${categories.find((category) => category.id === item.category)?.label || item.category}. This saves a draft and does not publish it.`)) return
    setBusy(true)
    try {
      await setArchived(item.id, 'restore')
      setErrorMsg('')
      setRevisionConflict(false)
      setSuccessMsg(`${item.name} restored to ${item.section} as an unpublished draft.`)
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 409) reportRevisionConflict()
      else reportError(cause)
    } finally { setBusy(false) }
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (newPhotoBusy) return
    const name = newName.trim()
    const categoryId = getCategoryForMenuSection(newSection, sections)
    const category = categories.find((entry) => entry.id === categoryId)
    const id = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (!name || !category || !id) {
      setErrorMsg('Enter an item name and choose a configured Gourmet section.')
      return
    }
    try {
      await saveItem({ id, name, price: Number(newPrice), category: category.id, section: newSection, description: newDescription.trim(), isSoldOut: false, ...(newImage ? { image: { ...newImage, alt: name } } : {}) })
      setNewName('')
      setNewPrice('')
      setNewDescription('')
      setNewImage(undefined)
      setErrorMsg('')
      setRevisionConflict(false)
      setSuccessMsg(`${name} added as an unpublished draft.`)
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 409) reportRevisionConflict()
      else reportError(cause)
    }
  }

  const handleExport = async () => {
    try {
      const backup = await exportMenu()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `cafein-menu-backup-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      setErrorMsg('')
      setSuccessMsg('Menu backup downloaded.')
    } catch (cause) { reportError(cause) }
  }

  const handleLegacyPreview = async () => {
    try {
      const current = await refresh()
      if (!current) throw new Error('The latest shared menu could not be loaded. Try again before reviewing saved browser edits.')
      const recovery = getLegacyMenuRecovery(current)
      if (!recovery) throw new Error('No saved browser edits were found.')
      setLegacyRecovery(recovery)
      setSelectedLegacyKeys(recovery.records.filter(({ status }) => status === 'valid').map(({ key }) => key))
      setErrorMsg('')
      setPendingBackup(null)
      setPendingPreview(null)
      setSuccessMsg('Review each saved change. Obsolete, invalid, and archived records are kept until you explicitly discard them.')
    } catch (cause) { reportError(cause) }
  }

  const handleLegacyDiscard = (record: LegacyRecoveryRecord) => {
    if (!window.confirm(`Remove the saved ${record.label.toLowerCase()} change for ${record.name} from this browser? This cannot be undone.`)) return
    const removed = removeLegacyOverrideRecords([record], { onlyIfUnchanged: true })
    if (!removed) { setErrorMsg('This saved value changed or could not be read while you reviewed it. Nothing was removed; review the current browser edits again.'); return }
    setLegacyAvailable(hasLegacyMenuOverrides())
    setLegacyRecovery((current) => current ? { ...current, records: current.records.filter(({ key }) => key !== record.key), total: current.total - 1 } : current)
    setSelectedLegacyKeys((current) => current.filter((key) => key !== record.key))
    setSuccessMsg(`Saved change for ${record.name} removed from this browser.`)
  }

  const handleDiscardMalformed = (issue: LegacyRecoveryIssue) => {
    const wholeKey = issue.key === 'malformed:json' || issue.key === 'malformed:root'
    const prompt = wholeKey
      ? 'This saved data cannot be separated into individual records. Remove the Cafe In recovery key only? Other browser storage is not affected.'
      : `Remove only the malformed “${issue.field}” entry? Other saved browser edits will be preserved.`
    if (!window.confirm(prompt)) return
    if (!discardMalformedLegacyOverride(issue)) { setErrorMsg('This browser could not remove the malformed recovery data. Nothing was changed.'); return }
    setLegacyAvailable(hasLegacyMenuOverrides())
    setLegacyRecovery((current) => current ? { ...current, malformed: current.malformed.filter(({ key }) => key !== issue.key), total: current.total - 1 } : current)
    setSuccessMsg(wholeKey ? 'The malformed recovery key was removed. Other browser storage was left untouched.' : `Malformed ${issue.field} data was removed; the other saved browser edits were preserved.`)
  }

  const handleLegacyApply = async () => {
    if (!legacyRecovery || !selectedLegacyKeys.length) return
    setBusy(true)
    const synchronized: LegacyRecoveryRecord[] = []
    let cleanupComplete = true
    try {
      const current = await refresh()
      if (!current) throw new Error('The latest shared menu could not be loaded. Saved browser edits remain untouched.')
      if (current.revision !== legacyRecovery.revision) {
        const updated = getLegacyMenuRecovery(current)
        if (updated) {
          setLegacyRecovery(updated)
          setSelectedLegacyKeys((keys) => keys.filter((key) => updated.records.some((record) => record.key === key && record.status === 'valid')))
        }
        setRevisionConflict(true)
        setErrorMsg('The shared menu changed while you reviewed these edits. Review the refreshed values before applying them. No saved edits were removed.')
        return
      }
      const latestRecovery = getLegacyMenuRecovery(current)
      if (!latestRecovery) throw new Error('Saved browser edits are no longer available. Nothing was applied.')
      const selectedRecords = legacyRecovery.records.filter((record) => selectedLegacyKeys.includes(record.key) && record.status === 'valid')
      const latestByKey = new Map(latestRecovery.records.map((record) => [record.key, record]))
      const changedSelection = selectedRecords.some((record) => {
        const latest = latestByKey.get(record.key)
        return !latest || latest.status !== 'valid' || JSON.stringify(latest.value) !== JSON.stringify(record.value)
      })
      if (changedSelection) {
        setLegacyRecovery(latestRecovery)
        setSelectedLegacyKeys((keys) => keys.filter((key) => latestByKey.get(key)?.status === 'valid'))
        setErrorMsg('Saved browser edits changed in this browser while you reviewed them. Review the refreshed records before applying. No data was removed.')
        return
      }
      const recoveryItems = buildLegacyRecoveryItems(current, latestRecovery, selectedLegacyKeys)
      if (!recoveryItems.length) {
        if (!window.confirm(`The ${selectedRecords.length} selected browser edit${selectedRecords.length === 1 ? '' : 's'} already match the current server drafts. Remove only these matching records from this browser?`)) return
        const removed = removeLegacyOverrideRecords(selectedRecords, { onlyIfUnchanged: true })
        setLegacyAvailable(hasLegacyMenuOverrides())
        setLegacyRecovery(null)
        setSelectedLegacyKeys([])
        setErrorMsg('')
        setRevisionConflict(false)
        setSuccessMsg(removed ? 'Selected values already matched the current menu and were cleared from browser recovery.' : 'The browser values changed during review; nothing new was removed. Review saved edits again.')
        return
      }
      if (!window.confirm(`Apply ${selectedRecords.length} selected browser edit${selectedRecords.length === 1 ? '' : 's'}?\n\nThese changes will be saved as unpublished drafts. Other saved, invalid, obsolete, and archived edits will remain in this browser.`)) return
      for (const item of recoveryItems) {
        await saveItem(item)
        const savedRecords = selectedRecords.filter((record) => record.id === item.id)
        synchronized.push(...savedRecords)
        if (!removeLegacyOverrideRecords(savedRecords, { onlyIfUnchanged: true })) cleanupComplete = false
      }
      setLegacyAvailable(hasLegacyMenuOverrides())
      setLegacyRecovery(null)
      setSelectedLegacyKeys([])
      setErrorMsg('')
      setRevisionConflict(false)
      setSuccessMsg(cleanupComplete
        ? `${selectedRecords.length} selected browser edit${selectedRecords.length === 1 ? '' : 's'} saved as unpublished drafts. Other recovery records were preserved.`
        : 'Selected edits were saved as unpublished drafts, but this browser could not clear them from recovery storage. Review them before another apply.')
    } catch (cause) {
      if (synchronized.length) {
        const refreshed = await refresh()
        const updated = refreshed ? getLegacyMenuRecovery(refreshed) : null
        setLegacyRecovery(updated)
        setSelectedLegacyKeys([])
        setLegacyAvailable(hasLegacyMenuOverrides())
        setErrorMsg(cause instanceof Error ? cause.message : 'Some changes could not be saved.')
        setSuccessMsg(`${synchronized.length} browser edit${synchronized.length === 1 ? '' : 's'} were saved as drafts. Remaining edits were kept in this browser and must be reviewed before retrying.`)
        setRevisionConflict(cause instanceof AdminApiError && cause.status === 409)
      } else if (cause instanceof AdminApiError && cause.status === 409) reportRevisionConflict()
      else reportError(cause)
    } finally { setBusy(false) }
  }

  const handleFile = async (file?: File) => {
    if (!file) return
    setPendingBackup(null)
    setPendingPreview(null)
    setLegacyRecovery(null)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      if (file.size > 1024 * 1024) throw new Error('Backup files must be 1 MB or smaller.')
      const parsed = JSON.parse(await file.text()) as MenuBackup
      const preview = await previewImport(parsed)
      setPendingBackup(parsed)
      setPendingPreview(preview)
    } catch (cause) { reportError(cause) }
  }

  const handleImport = async () => {
    if (!pendingBackup || !pendingPreview) return
    const summary = `Stage this backup?\n\nAdd: ${pendingPreview.added.length}\nUpdate: ${pendingPreview.updated.length}\nRemove: ${pendingPreview.removed.length}\n\nChanges will be saved as Sanity drafts and will not be published.`
    if (!window.confirm(summary)) return
    setBusy(true)
    try {
      const snapshot = await applyImport(pendingBackup, pendingPreview.baseRevision)
      setPendingBackup(null)
      setPendingPreview(null)
      setErrorMsg('')
      setRevisionConflict(false)
      setSuccessMsg(`Menu backup saved as drafts. ${snapshot.items.length} items are available for review.`)
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 409) reportRevisionConflict()
      else reportError(cause)
    } finally { setBusy(false) }
  }

  const handleLogout = async () => {
    try {
      await logoutAdmin()
      setIsAuthenticated(false)
      setErrorMsg('')
      setSuccessMsg('You have signed out.')
    } catch (cause) { reportError(cause) }
  }

  const handlePublish = async () => {
    if (!window.confirm('Publish the reviewed menu categories and items to the public website? The item named “example” will remain unpublished for owner review.')) return
    setBusy(true)
    try {
      const result = await publishApprovedMenu()
      await refresh()
      setErrorMsg('')
      setSuccessMsg(`Published ${result.publishedCategories} categories and ${result.publishedItems} menu items. ${result.heldForReview.length ? 'The example item remains a draft for owner review.' : ''}`)
    } catch (cause) { reportError(cause) } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-0 sm:p-4 lg:p-6" role="presentation">
      <div data-ui="manager-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="manager-title" className="relative flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col overflow-hidden border-bronze/35 bg-espresso-2 p-4 text-ivory shadow-2xl sm:h-auto sm:max-h-[94dvh] sm:max-w-6xl sm:rounded-3xl sm:border sm:p-6 xl:max-w-7xl">
        <div className="flex items-start justify-between gap-3 border-b border-ivory/10 pb-4">
          <div>
            <h3 id="manager-title" className="font-display text-xl text-ivory sm:text-2xl">Cafe In Manager Portal</h3>
            <p className="mt-1 text-[11px] text-bronze/80">Menu drafts · review before publishing</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close manager portal" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ivory/10 text-2xl leading-none text-ivory/70 transition-colors hover:bg-ivory/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bronze">&times;</button>
        </div>

        {!isAuthenticated ? (
          <form onSubmit={handleUnlock} className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-10 text-center sm:py-14">
            <p className="label mb-3 text-bronze">Cafe In · Manager</p>
            <h4 className="font-display text-xl text-ivory">Manager sign in</h4>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-ivory/60">Use your manager password to access menu controls.</p>
            <div className="mt-6 flex w-full max-w-sm flex-col gap-3">
              <label htmlFor="manager-password" className="sr-only">Manager password</label>
              <input id="manager-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Manager password" required className="min-h-11 rounded-xl border border-ivory/20 bg-black/40 px-4 py-2.5 text-center text-base tracking-wide text-ivory placeholder:text-ivory/40 focus:border-bronze focus:outline-none" />
              <button type="submit" disabled={busy} className="btn btn-primary min-h-11 w-full text-xs disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in'}</button>
            </div>
          </form>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col pt-3">
            <div className="flex flex-col gap-3 border-b border-ivory/10 pb-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-medium text-ivory">Draft menu workspace</p>
                <p className="mt-1 text-[11px] text-ivory/55">Changes stay unpublished. Review them before choosing to publish.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" disabled={busy || loading} onClick={() => void handlePublish()} className="min-h-11 rounded-lg border border-bronze/45 bg-bronze/10 px-4 text-xs font-semibold text-bronze hover:bg-bronze/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bronze disabled:opacity-50">Publish approved menu</button>
                {legacyAvailable && <button type="button" onClick={() => void handleLegacyPreview()} className="min-h-11 rounded-lg border border-bronze/30 px-4 text-xs text-bronze hover:border-bronze/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bronze">Review saved browser edits</button>}
                <button type="button" onClick={() => void handleLogout()} className="min-h-11 rounded-lg border border-ivory/15 px-4 text-xs text-ivory/70 hover:border-ivory/30 hover:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-bronze">Sign out</button>
              </div>
            </div>

            <details className="group my-3 shrink-0 rounded-2xl border border-bronze/25 bg-black/15">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-xs font-medium text-ivory marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-bronze">
                <span>Add a menu item <span className="ml-2 font-normal text-ivory/50">Create an unpublished draft</span></span>
                <span aria-hidden="true" className="text-lg leading-none text-bronze transition-transform group-open:rotate-45">+</span>
              </summary>
      <form onSubmit={handleCreate} className="grid max-h-[45dvh] grid-cols-1 gap-3 overflow-y-auto overscroll-contain border-t border-ivory/10 p-4 sm:grid-cols-2 lg:max-h-[42dvh] lg:grid-cols-[1.3fr_7rem_1fr_1.5fr_auto]">
                <label className="grid gap-1.5 text-xs tracking-wide text-ivory/70">Item name<input value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={80} required placeholder="Item name" className="min-h-11 rounded-lg border border-ivory/15 bg-black/30 px-3 text-sm normal-case tracking-normal text-ivory focus:border-bronze focus:outline-none focus-visible:ring-2 focus-visible:ring-bronze/60" /></label>
                <label className="grid gap-1.5 text-xs tracking-wide text-ivory/70">Price &#8377;<input type="number" min="0" max="100000" step="1" value={newPrice} onChange={(event) => setNewPrice(event.target.value)} required placeholder="0" className="min-h-11 rounded-lg border border-ivory/15 bg-black/30 px-3 text-sm normal-case tracking-normal text-ivory focus:border-bronze focus:outline-none focus-visible:ring-2 focus-visible:ring-bronze/60" /></label>
                <label className="grid gap-1.5 text-xs tracking-wide text-ivory/70">Gourmet section<select value={newSection} required disabled={!sections.length} onChange={(event) => setNewSection(event.target.value)} className="min-h-11 rounded-lg border border-ivory/15 bg-espresso px-3 text-sm normal-case tracking-normal text-ivory focus:border-bronze focus:outline-none focus-visible:ring-2 focus-visible:ring-bronze/60 disabled:opacity-50"><option value="" disabled>{sections.length ? 'Choose a section' : 'No sections configured'}</option>{sections.map(({ section }) => <option key={section} value={section}>{section}</option>)}</select><span className="text-[10px] text-ivory/45">Parent category: {categories.find((category) => category.id === getCategoryForMenuSection(newSection, sections))?.label || 'Choose a section'}</span></label>
                <label className="grid gap-1.5 text-xs tracking-wide text-ivory/70">Description<input value={newDescription} onChange={(event) => setNewDescription(event.target.value)} maxLength={500} placeholder="Optional" className="min-h-11 rounded-lg border border-ivory/15 bg-black/30 px-3 text-sm normal-case tracking-normal text-ivory focus:border-bronze focus:outline-none focus-visible:ring-2 focus-visible:ring-bronze/60" /></label>
                <button type="submit" disabled={newPhotoBusy || !sections.length} className="btn btn-primary min-h-11 self-end px-4 text-xs disabled:opacity-50">{newPhotoBusy ? 'Uploading photo...' : 'Add draft'}</button>
                <div className="sm:col-span-2 lg:col-span-5"><PhotoUploadField value={newImage} onChange={setNewImage} onUploadingChange={setNewPhotoBusy} /></div>
              </form>
            </details>

            <div className="grid shrink-0 grid-cols-1 gap-2 pb-3 sm:grid-cols-[minmax(0,1fr)_15rem_auto]">
              <label className="sr-only" htmlFor="manager-search">Search menu items</label>
              <input id="manager-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, section, or description" className="min-h-11 min-w-0 rounded-xl border border-ivory/15 bg-black/30 px-3 text-sm text-ivory placeholder:text-ivory/45 focus:border-bronze focus:outline-none focus-visible:ring-2 focus-visible:ring-bronze/60" />
              <label className="sr-only" htmlFor="manager-category">Filter by category</label>
              <select id="manager-category" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="min-h-11 min-w-0 rounded-xl border border-ivory/15 bg-espresso px-3 text-sm text-ivory focus:border-bronze focus:outline-none focus-visible:ring-2 focus-visible:ring-bronze/60">
                <option value="all">All categories ({statusItems.length})</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
              </select>
              <button type="button" disabled={loading || busy} onClick={() => void handleReloadLatest()} className="min-h-11 rounded-xl border border-ivory/15 px-4 text-xs text-ivory/75 transition-colors hover:border-bronze/50 hover:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze disabled:opacity-50">Reload latest</button>
            </div>

            <div role="group" aria-label="Menu item status" className="mb-3 flex flex-wrap items-center gap-2">
              <button type="button" aria-pressed={!showArchived} onClick={() => setShowArchived(false)} className={`min-h-11 rounded-full border px-4 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-bronze ${!showArchived ? 'border-bronze/50 bg-bronze/10 text-bronze' : 'border-ivory/15 text-ivory/60 hover:text-ivory'}`}>Active items <span className="ml-1 tabular-nums">{items.filter((item) => !item.isArchived).length}</span></button>
              <button type="button" aria-pressed={showArchived} onClick={() => setShowArchived(true)} className={`min-h-11 rounded-full border px-4 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-bronze ${showArchived ? 'border-bronze/50 bg-bronze/10 text-bronze' : 'border-ivory/15 text-ivory/60 hover:text-ivory'}`}>Archived Items <span className="ml-1 tabular-nums">{items.filter((item) => item.isArchived).length}</span></button>
            </div>

            <div className="mb-2 flex shrink-0 items-center justify-between text-[11px] text-ivory/55">
              <p aria-live="polite" aria-atomic="true">{loading ? 'Loading menu drafts...' : `${filteredItems.length} of ${statusItems.length} ${showArchived ? 'archived' : 'active'} items`}</p>
              <p className="hidden sm:block">Select an item to edit its draft</p>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-3 overflow-y-auto overscroll-contain pr-1 sm:pr-2 lg:grid-cols-2">
              {loading ? <p className="py-10 text-center text-sm text-ivory/55">Loading menu drafts...</p> : filteredItems.length ? filteredItems.map((item) => <ItemEditor key={`${item.id}:${editorResetVersion}`} item={item} categories={categories} sections={sections} conflict={revisionConflict} managerBusy={busy} onSave={handleSave} onArchive={handleArchive} onRestore={handleRestore} />) : <div className="rounded-2xl border border-dashed border-ivory/15 px-5 py-12 text-center"><p className="font-display text-lg text-ivory">{showArchived ? 'No archived items' : 'No items found'}</p><p className="mt-2 text-xs text-ivory/55">{showArchived ? 'Items you archive will remain here and can be restored at any time.' : 'Try another search or category filter.'}</p></div>}
            </div>

            {legacyRecovery && (
              <section aria-labelledby="legacy-recovery-title" className="mt-3 shrink-0 rounded-xl border border-bronze/30 bg-bronze/[0.07] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 id="legacy-recovery-title" className="text-sm font-semibold text-ivory">Saved browser edits</h3>
                    <p className="mt-1 text-[10px] leading-relaxed text-ivory/65">{legacyRecovery.total} records · {legacyRecovery.records.filter(({ status }) => status === 'valid').length} valid · {legacyRecovery.records.filter(({ status }) => status === 'obsolete').length} obsolete · {legacyRecovery.records.filter(({ status }) => status === 'invalid').length + legacyRecovery.malformed.length} invalid or malformed · {legacyRecovery.records.filter(({ status }) => status === 'archived').length} archived · {revisionConflict ? 1 : 0} revision conflicts</p>
                    <p className="mt-1 text-[10px] text-ivory/50">Valid edits show the current draft and saved browser value. Applying saves unpublished drafts only.</p>
                  </div>
                  <button type="button" onClick={() => setLegacyRecovery(null)} className="min-h-11 rounded-lg px-3 text-[10px] text-ivory/60 hover:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-bronze">Close review</button>
                </div>
                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                  {legacyRecovery.records.map((record) => (
                    <div key={record.key} className="grid gap-2 rounded-lg border border-ivory/10 bg-black/20 p-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="break-words text-[11px] font-medium text-ivory">{record.name} <span className="text-ivory/45">· {record.label}</span></p>
                        {record.status === 'valid' ? <p className="mt-1 break-words text-[10px] text-ivory/60">Current draft: <span className="text-ivory/85">{formatRecoveryValue(record, record.currentValue)}</span> <span className="mx-1 text-bronze">→</span> Saved browser value: <span className="text-bronze">{formatRecoveryValue(record, record.value)}</span></p> : <p className="mt-1 text-[10px] leading-relaxed text-amber-100/80">{record.reason}</p>}
                      </div>
                      <div className="flex min-h-10 items-center gap-3">
                        {record.status === 'valid' && <label className="inline-flex min-h-10 items-center gap-2 text-[10px] text-ivory/75"><input type="checkbox" aria-label={`Apply ${record.label} for ${record.name}`} checked={selectedLegacyKeys.includes(record.key)} onChange={(event) => setSelectedLegacyKeys((keys) => event.target.checked ? [...new Set([...keys, record.key])] : keys.filter((key) => key !== record.key))} className="h-4 w-4 accent-[#C49A63]" />Apply</label>}
                        <button type="button" onClick={() => handleLegacyDiscard(record)} className="min-h-11 rounded-md px-2 text-[10px] text-ivory/55 underline decoration-ivory/25 underline-offset-2 hover:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-bronze">Discard</button>
                      </div>
                    </div>
                  ))}
                  {legacyRecovery.malformed.map((record) => <div key={record.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/15 bg-black/20 p-2.5"><p className="text-[10px] leading-relaxed text-amber-100/80">{record.field}: {record.reason}</p><button type="button" onClick={() => handleDiscardMalformed(record)} className="min-h-11 px-2 text-[10px] text-ivory/55 underline underline-offset-2 hover:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-bronze">Discard this malformed record</button></div>)}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" disabled={busy || !selectedLegacyKeys.some((key) => legacyRecovery.records.some((record) => record.key === key && record.status === 'valid'))} onClick={() => void handleLegacyApply()} className="min-h-11 rounded-lg bg-bronze px-4 text-xs font-semibold text-espresso disabled:opacity-50">{busy ? 'Checking and saving…' : `Apply selected (${selectedLegacyKeys.filter((key) => legacyRecovery.records.some((record) => record.key === key && record.status === 'valid')).length})`}</button>
                  <p className="text-[10px] text-ivory/50">Unselected and unresolved records stay saved in this browser.</p>
                </div>
              </section>
            )}

            {pendingPreview && (
              <div className="mt-3 rounded-xl border border-bronze/30 bg-bronze/10 p-3 text-xs">
                <p className="font-semibold text-ivory">Backup preview · {pendingPreview.itemCount} items</p>
                <p className="mt-1 text-ivory/65">Add {pendingPreview.added.length} · Update {pendingPreview.updated.length} · Remove {pendingPreview.removed.length}</p>
                {pendingPreview.removed.length > 0 && <p role="alert" className="mt-2 text-[10px] leading-relaxed text-amber-200">This backup removes existing items. The Vercel draft workflow cannot safely represent staged deletions, so this import is blocked without changing content.</p>}
                <div className="mt-2 grid gap-1 text-[10px] leading-relaxed text-ivory/65 sm:grid-cols-3">
                  {([
                    ['Adding', pendingPreview.added, pendingBackup?.items ?? []],
                    ['Updating', pendingPreview.updated, pendingBackup?.items ?? []],
                    ['Removing', pendingPreview.removed, items],
                  ] as const).map(([label, ids, source]) => (
                    <p key={label} className="max-h-16 overflow-y-auto rounded-md border border-ivory/10 bg-black/15 px-2 py-1">
                      <span className="font-semibold text-bronze">{label}: </span>
                      {ids.length ? ids.map((id) => source.find((item) => item.id === id)?.name || id).join(', ') : 'None'}
                    </p>
                  ))}
                </div>
                <button type="button" disabled={busy || pendingPreview.removed.length > 0} onClick={() => void handleImport()} className="mt-2 min-h-10 rounded-lg bg-bronze px-3 text-[10px] font-semibold text-espresso disabled:opacity-50">{busy ? 'Saving drafts…' : 'Stage backup as drafts'}</button>
                <button type="button" onClick={() => { setPendingBackup(null); setPendingPreview(null) }} className="ml-2 min-h-10 px-3 text-[10px] text-ivory/65">Cancel</button>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ivory/10 pt-3">
              <label className="inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-ivory/20 bg-ivory/10 px-3 text-[10px] text-ivory hover:bg-ivory/15 focus-within:outline focus-within:outline-2 focus-within:outline-bronze">
                Import JSON
                <input type="file" accept="application/json,.json" className="sr-only" onChange={(event) => { void handleFile(event.target.files?.[0]); event.currentTarget.value = '' }} />
              </label>
              <button type="button" onClick={() => void handleExport()} className="min-h-10 rounded-lg border border-ivory/20 bg-ivory/10 px-3 text-[10px] text-ivory hover:bg-ivory/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bronze">Export JSON backup</button>
            </div>
          </div>
        )}

        {(errorMsg || error) && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-500/10 px-3 py-2"><p role="alert" className="min-w-0 flex-1 text-xs text-red-200">{errorMsg || error}</p>{revisionConflict && <button type="button" disabled={busy} onClick={() => void handleReloadLatest()} className="min-h-10 shrink-0 rounded-lg border border-amber-200/30 px-3 text-[10px] font-semibold text-amber-100 hover:bg-amber-100/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-100 disabled:opacity-50">Reload and discard edits</button>}</div>}
        {successMsg && <p role="status" className="mt-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{successMsg}</p>}
      </div>
    </div>
  )
}
