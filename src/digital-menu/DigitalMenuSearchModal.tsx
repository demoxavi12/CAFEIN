import { useState } from 'react'
import type { EnhancedMenuItem } from './adminStore'
import { MenuDishCard } from './MenuDishCard'

interface Props {
  isOpen: boolean
  onClose: () => void
  items: EnhancedMenuItem[]
  tray: Record<string, number>
  onSelect: (item: EnhancedMenuItem) => void
  onAdd: (id: string) => void
  onRemove: (id: string) => void
}

export function DigitalMenuSearchModal({
  isOpen,
  onClose,
  items,
  tray,
  onSelect,
  onAdd,
  onRemove,
}: Props) {
  const [query, setQuery] = useState('')

  if (!isOpen) return null

  const q = query.trim().toLowerCase()
  const results = q.length === 0
    ? []
    : items.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.section.toLowerCase().includes(q) ||
          (m.description && m.description.toLowerCase().includes(q))
      )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="relative mt-8 w-full max-w-xl max-h-[85vh] overflow-hidden rounded-3xl border border-ivory/15 bg-espresso-2 p-5 shadow-2xl flex flex-col text-ivory">
        {/* Search Input Bar */}
        <div className="flex items-center gap-2 border-b border-ivory/10 pb-3">
          <svg className="h-5 w-5 text-bronze shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search coffee, pasta, sandwiches, cheesecakes..."
            className="w-full bg-transparent text-sm sm:text-base text-ivory placeholder:text-ivory/40 focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-ivory/10 text-ivory/70 hover:bg-ivory/20 transition-colors text-xs"
          >
            ✕
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-3 flex flex-col gap-3">
          {q.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-ivory/50">
              <p className="text-xs uppercase tracking-widest font-mono text-bronze">
                Quick Recommendations
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 max-w-sm">
                {['Biscoff Latte', 'Alfredo Penne', 'Hot Chocolate', 'Walnut Brownie', 'Vietnamese Iced Coffee'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQuery(s)}
                    className="rounded-full border border-ivory/15 bg-ivory/5 px-3 py-1 text-xs text-ivory hover:border-bronze hover:text-bronze transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-ivory/50">
              <p className="font-display text-xl text-ivory">No items matched "{query}"</p>
              <p className="mt-1 text-xs">Try searching for latte, penne, frappe, or cake</p>
            </div>
          ) : (
            results.map((item) => (
              <MenuDishCard
                key={item.id}
                item={item}
                quantityInTray={tray[item.id] ?? 0}
                onSelect={(selected) => {
                  onSelect(selected)
                  onClose()
                }}
                onAdd={onAdd}
                onRemove={onRemove}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
