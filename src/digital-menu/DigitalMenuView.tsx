import { useState } from 'react'
import { Play, Sparkles } from 'lucide-react'
import { useLiveMenu, type EnhancedMenuItem } from './adminStore'
import { useCustomerTray } from './trayStore'
import { DigitalMenuHeader } from './DigitalMenuHeader'
import { ConceptDeckCarousel } from './ConceptDeckCarousel'
import { ConceptRailCarousel } from './ConceptRailCarousel'
import { DigitalMenuDetailSheet } from './DigitalMenuDetailSheet'
import { DigitalMenuSearchModal } from './DigitalMenuSearchModal'
import { DigitalMenuAdminModal } from './DigitalMenuAdminModal'
import { TableOrderTrayModal } from './TableOrderTrayModal'
import { OrderTrayFloatingBar } from './OrderTrayFloatingBar'
import { CafeAtmosphereModal } from './CafeAtmosphereModal'

interface Props {
  onExitMenu: () => void
}

export function DigitalMenuView({ onExitMenu }: Props) {
  const { items } = useLiveMenu()
  const { tray, addItem, removeItem, clearTray } = useCustomerTray()

  // Initialize state directly from URL search params without cascading effects
  const [mode, setMode] = useState<'deck' | 'rails'>(() => {
    if (typeof window === 'undefined') return 'deck'
    const params = new URLSearchParams(window.location.search)
    return params.get('concept') === 'rails' ? 'rails' : 'deck'
  })
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
    <div className="min-h-screen bg-espresso text-ivory flex flex-col font-sans selection:bg-bronze selection:text-espresso pb-20">
      {/* Mobile-first Header */}
      <DigitalMenuHeader
        mode={mode}
        onModeChange={setMode}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onExitMenu={onExitMenu}
        tableNumber={tableNumber}
        setTableNumber={setTableNumber}
      />

      {/* Atmosphere Reel Teaser Banner */}
      <div className="w-full max-w-5xl mx-auto px-3 pt-3 sm:px-6">
        <div
          onClick={() => setIsAtmosphereOpen(true)}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-ivory/12 bg-gradient-to-r from-mocha via-espresso-2 to-mocha p-3 sm:p-3.5 shadow-lg transition-all duration-300 hover:border-bronze/50 hover:shadow-bronze/10 flex items-center justify-between gap-3"
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bronze/20 text-bronze border border-bronze/40 group-hover:bg-bronze group-hover:text-espresso transition-colors">
              <Play className="h-4 w-4 fill-current ml-0.5" />
              <span className="absolute -inset-1 rounded-xl border border-bronze/30 animate-pulse pointer-events-none" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono tracking-widest text-bronze font-bold flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Cafe In Experience</span>
                </span>
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-mono text-emerald-300 border border-emerald-500/30">
                  Video Reel
                </span>
              </div>
              <p className="font-display text-sm sm:text-base text-ivory">
                Watch our in-café atmosphere & interior video
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-bronze group-hover:text-ivory transition-colors shrink-0">
            <span className="hidden sm:inline">Play Reel</span>
            <span className="text-sm">→</span>
          </div>
        </div>
      </div>

      {/* Main Presentation Body */}
      <main className="flex-1 w-full max-w-5xl mx-auto">
        {mode === 'deck' ? (
          <ConceptDeckCarousel
            items={items}
            tray={tray}
            onSelect={setSelectedItem}
            onAdd={addItem}
            onRemove={removeItem}
          />
        ) : (
          <ConceptRailCarousel
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
        <p className="font-mono text-[11px] text-bronze uppercase tracking-widest">
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
