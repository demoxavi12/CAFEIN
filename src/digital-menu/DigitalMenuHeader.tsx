import { Wordmark } from '../components/Wordmark'
import { CafeInLogo } from '../components/CafeInLogo'
import { ShoppingBag } from 'lucide-react'

interface Props {
  onOpenSearch: () => void
  onOpenAdmin: () => void
  showAdminButton: boolean
  onExitMenu: () => void
  tableNumber: string
  setTableNumber: (t: string) => void
  selectedCount: number
  onOpenTray: () => void
}

export function DigitalMenuHeader({
  onOpenSearch,
  onOpenAdmin,
  showAdminButton,
  onExitMenu,
  tableNumber,
  setTableNumber,
  selectedCount,
  onOpenTray,
}: Props) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-ivory/10 bg-espresso/90 backdrop-blur-md">
      {/* Top Banner / Utility Bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2.5 text-xs border-b border-ivory/5 text-ivory/70 sm:px-6">
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
            className="min-h-9 rounded px-2 py-1 bg-ivory/10 text-ivory/90 hover:bg-ivory/20 font-mono text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-bronze"
            title="Tap to change table number"
          >
            Table: {tableNumber}
          </button>}
        </div>

        {/* Route back to Main Website Link */}
        <button
          type="button"
          onClick={onExitMenu}
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 text-xs tracking-wide font-semibold text-bronze hover:text-ivory transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
        >
          <span>Visit Full Website</span>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>

      {/* Main Bar */}
      <div className="digital-menu-header__main flex items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Logo medallion */}
          <div className="relative h-10 w-10 shrink-0 rounded-full border border-bronze/40 p-0.5 shadow-md sm:h-11 sm:w-11">
            <div className="absolute inset-[9%] overflow-hidden rounded-full bg-[#f4e8d7]">
              <CafeInLogo className="scale-[.86]" />
            </div>
          </div>
          <div className="digital-menu-header__brand min-w-0">
            <Wordmark className="text-base text-ivory leading-tight" />
            <p className="text-xs tracking-widest text-bronze font-mono uppercase">
              Coffee • Vibes • Memories
            </p>
            <h1 className="digital-menu-header__title">In-Café Menu</h1>
          </div>
        </div>

        {/* Action icons */}
        <div className="digital-menu-header__actions flex shrink-0 items-center gap-2">
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={onOpenTray}
              aria-label={`View selected items, ${selectedCount} ${selectedCount === 1 ? 'item' : 'items'}`}
              className="digital-menu-header__tray relative flex h-11 w-11 items-center justify-center rounded-full border border-bronze/35 bg-ivory/5 text-bronze transition-colors hover:bg-mocha focus-visible:outline focus-visible:outline-2 focus-visible:outline-bronze"
            >
              <ShoppingBag aria-hidden="true" className="h-4 w-4" />
              <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-olive px-1 text-[10px] font-bold text-white">
                {selectedCount}
              </span>
            </button>
          )}
          {/* Search trigger */}
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search menu"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-ivory/15 bg-ivory/5 text-ivory hover:bg-ivory/15 active:scale-95 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-bronze"
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
            className="flex h-11 w-11 items-center justify-center rounded-full border border-ivory/15 bg-ivory/5 text-ivory/70 hover:text-bronze hover:border-bronze/40 active:scale-95 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-bronze"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </button>
        </div>
      </div>

    </header>
  )
}
