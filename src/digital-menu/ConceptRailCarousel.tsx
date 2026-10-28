import { useMemo, useRef } from 'react'
import type { EnhancedMenuItem } from './adminStore'
import { MenuDishCard } from './MenuDishCard'

interface Props {
  items: EnhancedMenuItem[]
  tray: Record<string, number>
  onSelect: (item: EnhancedMenuItem) => void
  onAdd: (id: string) => void
  onRemove: (id: string) => void
}

export function ConceptRailCarousel({
  items,
  tray,
  onSelect,
  onAdd,
  onRemove,
}: Props) {
  // Group all items by their printed section name
  const groupedSections = useMemo(() => {
    const map = new Map<string, EnhancedMenuItem[]>()
    for (const item of items) {
      const list = map.get(item.section) ?? []
      list.push(item)
      map.set(item.section, list)
    }
    return Array.from(map, ([section, sectionItems]) => ({
      section,
      items: sectionItems,
    }))
  }, [items])

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  const scrollToSection = (secName: string) => {
    const el = sectionRefs.current[secName]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="flex flex-col pb-12">
      {/* Sticky Fast-Jump Navigation Bar */}
      <div className="sticky top-[110px] z-30 border-b border-ivory/10 bg-espresso/95 px-3 py-2 backdrop-blur-md sm:px-6">
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
          {groupedSections.map((g) => (
            <button
              key={g.section}
              type="button"
              onClick={() => scrollToSection(g.section)}
              className="shrink-0 rounded-full border border-ivory/15 bg-ivory/5 px-3 py-1 text-[11px] font-medium tracking-wide text-ivory/80 hover:border-bronze hover:text-bronze active:scale-95 transition-all"
            >
              {g.section}
            </button>
          ))}
        </div>
      </div>

      {/* Vertical List of Horizontal Section Rails */}
      <div className="mt-4 flex flex-col gap-8 px-3 sm:px-6">
        {groupedSections.map((group) => (
          <section
            key={group.section}
            ref={(el) => {
              sectionRefs.current[group.section] = el
            }}
            className="flex flex-col scroll-mt-36"
          >
            {/* Section Header */}
            <div className="flex items-baseline justify-between border-b border-ivory/10 pb-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-bronze" />
                <h3 className="font-display text-lg tracking-wide text-ivory">
                  {group.section}
                </h3>
              </div>
              <span className="text-[11px] font-mono text-ivory/50">
                {group.items.length} options
              </span>
            </div>

            {/* Horizontal Carousel for this section */}
            <div className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-3.5 overflow-x-auto py-1">
              {group.items.map((item) => (
                <div key={item.id} className="snap-start">
                  <MenuDishCard
                    item={item}
                    quantityInTray={tray[item.id] ?? 0}
                    onSelect={onSelect}
                    onAdd={onAdd}
                    onRemove={onRemove}
                    compact={true}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
