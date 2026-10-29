import { motion } from 'motion/react'
import { Wordmark } from '../components/Wordmark'
import { images } from '../data/images'

interface Props {
  mode: 'deck' | 'rails'
  onModeChange: (m: 'deck' | 'rails') => void
  onOpenSearch: () => void
  onOpenAdmin: () => void
  showAdminButton: boolean
  onExitMenu: () => void
  tableNumber: string
  setTableNumber: (t: string) => void
}

export function DigitalMenuHeader({
  mode,
  onModeChange,
  onOpenSearch,
  onOpenAdmin,
  showAdminButton,
  onExitMenu,
  tableNumber,
  setTableNumber,
}: Props) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-ivory/10 bg-espresso/90 backdrop-blur-md">
      {/* Top Banner / Utility Bar */}
      <div className="flex items-center justify-between px-3 py-2 text-xs border-b border-ivory/5 text-ivory/70 sm:px-4">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium tracking-wide">Live In-Café Menu</span>
          <span className="text-ivory/30">•</span>
          {showAdminButton && <button
            type="button"
            onClick={() => {
              const next = prompt('Enter your Table Number:', tableNumber)
              if (next !== null && next.trim()) setTableNumber(next.trim())
            }}
            className="rounded px-1.5 py-0.5 bg-ivory/10 text-ivory/90 hover:bg-ivory/20 font-mono text-[11px] transition-colors"
            title="Tap to change table number"
          >
            Table: {tableNumber}
          </button>}
        </div>

        {/* Route back to Main Website Link */}
        <button
          type="button"
          onClick={onExitMenu}
          className="inline-flex items-center gap-1.5 text-[11px] tracking-wider uppercase font-semibold text-bronze hover:text-ivory transition-colors"
        >
          <span>Visit Full Website</span>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>

      {/* Main Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Logo medallion */}
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-bronze/40 p-0.5 shadow-md">
            <img
              src={images.logoMedallion.src}
              alt="Cafe In"
              className="h-full w-full rounded-full object-cover"
            />
          </div>
          <div>
            <Wordmark className="text-base text-ivory leading-tight" />
            <p className="text-[10px] tracking-widest text-bronze font-mono uppercase">
              Coffee • Vibes • Memories
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          {/* Search trigger */}
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ivory/15 bg-ivory/5 text-ivory hover:bg-ivory/15 active:scale-95 transition-all"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </button>

          {/* Admin manager button */}
          <button
            type="button"
            onClick={onOpenAdmin}
            aria-label="Admin edit mode"
            title="Café Manager / Admin Edit Mode"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ivory/15 bg-ivory/5 text-ivory/70 hover:text-bronze hover:border-bronze/40 active:scale-95 transition-all"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Concept Switcher Ribbon (The 2 variations for the owner to preview) */}
      <div className="flex items-center justify-between border-t border-ivory/10 bg-black/20 px-3 py-1.5 sm:px-6">
        <span className="text-[10px] uppercase tracking-wider text-ivory/60 font-medium">
          Menu Experience:
        </span>
        <div className="flex items-center rounded-full bg-ivory/10 p-0.5 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => onModeChange('deck')}
            className={`relative rounded-full px-3 py-1 transition-colors ${
              mode === 'deck' ? 'text-espresso font-bold' : 'text-ivory/70 hover:text-ivory'
            }`}
          >
            {mode === 'deck' && (
              <motion.span
                layoutId="concept-pill"
                className="absolute inset-0 rounded-full bg-bronze"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <span>Deck Carousel</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange('rails')}
            className={`relative rounded-full px-3 py-1 transition-colors ${
              mode === 'rails' ? 'text-espresso font-bold' : 'text-ivory/70 hover:text-ivory'
            }`}
          >
            {mode === 'rails' && (
              <motion.span
                layoutId="concept-pill"
                className="absolute inset-0 rounded-full bg-bronze"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <span>Gourmet Rails</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
