import { useState } from 'react'
import { Play, Sparkles } from 'lucide-react'
import { useLiveMenu, type EnhancedMenuItem } from './adminStore'
import { useCustomerTray } from './trayStore'
import { DigitalMenuHeader } from './DigitalMenuHeader'
import { CafeInLogo } from '../components/CafeInLogo'
import { CategoryMenu } from './CategoryMenu'
import { DigitalMenuDetailSheet } from './DigitalMenuDetailSheet'
import { DigitalMenuSearchModal } from './DigitalMenuSearchModal'
import { DigitalMenuAdminModal } from './DigitalMenuAdminModal'
import { TableOrderTrayModal } from './TableOrderTrayModal'
import { OrderTrayFloatingBar } from './OrderTrayFloatingBar'
import { CafeAtmosphereModal } from './CafeAtmosphereModal'
import { isLocalDraftPreviewRequested } from './sanityPreview'
import './digital-menu-theme.css'

interface Props {
  onExitMenu: () => void
}

export function DigitalMenuView({ onExitMenu }: Props) {
  const draftPreview = isLocalDraftPreviewRequested()
  const { items, categories, loading: menuLoading, error: menuError, dataSource, previewError, previewSummary } = useLiveMenu({ draftPreview })
  const { tray, addItem, removeItem, clearTray } = useCustomerTray()

  const [selectedItem, setSelectedItem] = useState<EnhancedMenuItem | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isAdminOpen, setIsAdminOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('admin') === '1'
  })
  const [isTrayModalOpen, setIsTrayModalOpen] = useState(false)
  const [isAtmosphereOpen, setIsAtmosphereOpen] = useState(false)

  // Grab table number from URL (e.g. ?table=07) or default
  const [tableNumber, setTableNumber] = useState(() => {
    if (typeof window === 'undefined') return '04'
    return new URLSearchParams(window.location.search).get('table') || '04'
  })

  return (
    <div className="digital-menu-theme min-h-screen bg-espresso text-ivory flex flex-col font-sans selection:bg-bronze selection:text-espresso pb-24">
      {/* Mobile-first Header */}
      <DigitalMenuHeader
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        showAdminButton={dataSource === 'legacy'}
        onExitMenu={onExitMenu}
        tableNumber={tableNumber}
        setTableNumber={setTableNumber}
        selectedCount={Object.values(tray).reduce((total, quantity) => total + quantity, 0)}
        onOpenTray={() => setIsTrayModalOpen(true)}
      />

      {draftPreview && (
        <div role={previewError ? 'alert' : 'status'} className="mx-auto mt-3 w-full max-w-5xl px-3 sm:px-6">
          <div className={`rounded-xl border px-4 py-3 text-sm ${previewError ? 'border-amber-300/40 bg-amber-950/50 text-amber-100' : 'border-bronze/30 bg-espresso-2 text-ivory-2'}`}>
            {previewError
              ? `Local Sanity draft preview unavailable: ${previewError} Showing the existing published or JSON/API fallback.`
              : dataSource === 'sanity-preview' && previewSummary
                ? `Local draft preview · ${previewSummary.categoryCount} categories · ${previewSummary.menuItemCount} menu items · ${previewSummary.realSpecialReferences} real specials · ${previewSummary.temporarySpecialEntries} temporary entries · ${previewSummary.imageAssetCount} images · ${previewSummary.publishedDocumentCount} published documents.`
                : 'Loading authenticated Sanity drafts for local preview…'}
          </div>
        </div>
      )}

      {/* Keep the atmosphere reel available as a quiet utility link. */}
      <div className="digital-menu-atmosphere mx-auto w-full max-w-5xl px-4 pt-2 sm:px-6">
        <button
          type="button"
          onClick={() => setIsAtmosphereOpen(true)}
          aria-label="Play the Cafe In atmosphere video"
          className="group relative flex w-full items-center justify-between gap-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
        >
          <div className="digital-menu-atmosphere-content flex min-w-0 items-center gap-3">
            <div className="digital-menu-atmosphere-icon relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bronze/20 text-bronze border border-bronze/40 group-hover:bg-bronze group-hover:text-espresso transition-colors">
              <Play className="h-4 w-4 fill-current ml-0.5" />
              <span className="absolute -inset-1 rounded-xl border border-bronze/30 animate-pulse pointer-events-none" />
            </div>
            <div className="min-w-0">
              <div className="digital-menu-atmosphere-meta flex items-center gap-2">
                <span className="text-[11px] uppercase font-mono tracking-widest text-bronze font-bold flex items-center gap-1">
                  <Sparkles aria-hidden="true" className="w-3 h-3" />
                  <span>Cafe In Experience</span>
                </span>
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-500/30">
                  Video Reel
                </span>
              </div>
              <p className="truncate font-display text-sm sm:text-base text-ivory">
                Watch our in-café atmosphere & interior video
              </p>
            </div>
          </div>

          <span className="flex items-center gap-1.5 text-xs font-semibold text-bronze group-hover:text-ivory transition-colors shrink-0">
            <span className="hidden sm:inline">Play Reel</span>
            <span className="text-sm">→</span>
          </span>
        </button>
      </div>

      {/* Single category-based menu presentation */}
      <main className="digital-menu-main mx-auto w-full max-w-[96rem] flex-1 lg:px-4 xl:px-8">
        {!menuLoading && !menuError && items.length > 0 && (
          <p className="mx-3 mt-3 flex items-center gap-2 text-xs text-ivory/65 sm:mx-6">
            <span aria-hidden="true" className="flex h-4 w-4 items-center justify-center rounded border border-emerald-500/80 bg-emerald-950/40 p-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Vegetarian
          </p>
        )}
        {menuLoading ? (
          <p role="status" className="px-5 py-16 text-center text-sm text-ivory/60">Loading the current menu…</p>
        ) : menuError ? (
          <div role="alert" className="mx-4 my-10 rounded-2xl border border-bronze/25 bg-espresso-2 p-6 text-center">
            <p className="font-display text-lg text-ivory">The menu is temporarily unavailable.</p>
            <p className="mt-2 text-sm text-ivory/60">{menuError}</p>
          </div>
        ) : (
          <CategoryMenu
            categories={categories}
            items={items}
            tray={tray}
            onSelect={setSelectedItem}
            onAdd={addItem}
            onRemove={removeItem}
          />
        )}
      </main>

      {/* In-Café Footer */}
      <footer className="mt-8 border-t border-ivory/10 px-4 py-8 text-center text-xs text-ivory/50 flex flex-col items-center gap-3">
        <span className="block h-12 w-12 overflow-hidden rounded-full bg-[#f4e8d7] ring-1 ring-bronze/40">
          <CafeInLogo />
        </span>
        <p className="font-mono text-xs text-bronze uppercase tracking-widest">
          Cafe In • Coffee • Vibes • Memories
        </p>
        <p className="max-w-xs text-ivory/40 text-[11px] leading-relaxed">
          Prices are inclusive of all taxes. For allergen details or dietary customizations, please inform your table server.
        </p>
        <div className="flex items-center gap-4 mt-2">
          <button
            type="button"
            onClick={onExitMenu}
            className="text-ivory/70 hover:text-ivory underline underline-offset-4 transition-colors"
          >
            ← Back to Full Website
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setIsAdminOpen(true)}
            className="text-ivory/40 hover:text-bronze transition-colors"
          >
            Manager Login
          </button>
        </div>
      </footer>

      {/* Floating Order Tray Bar */}
      <OrderTrayFloatingBar
        tray={tray}
        items={items}
        onOpenTray={() => setIsTrayModalOpen(true)}
      />

      {/* Item Detail Bottom Sheet */}
      <DigitalMenuDetailSheet
        item={selectedItem}
        quantityInTray={selectedItem ? (tray[selectedItem.id] ?? 0) : 0}
        onClose={() => setSelectedItem(null)}
        onAdd={addItem}
        onRemove={removeItem}
      />

      {/* Search Modal */}
      <DigitalMenuSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        items={items}
        tray={tray}
        onSelect={setSelectedItem}
        onAdd={addItem}
        onRemove={removeItem}
      />

      {/* Admin Management Modal */}
      <DigitalMenuAdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />

      {/* Table Order Summary Modal */}
      <TableOrderTrayModal
        isOpen={isTrayModalOpen}
        onClose={() => setIsTrayModalOpen(false)}
        tray={tray}
        items={items}
        tableNumber={tableNumber}
        onAdd={addItem}
        onRemove={removeItem}
        onClear={clearTray}
      />

      {/* Cafe Atmosphere Video Modal */}
      <CafeAtmosphereModal
        isOpen={isAtmosphereOpen}
        onClose={() => setIsAtmosphereOpen(false)}
      />
    </div>
  )
}
