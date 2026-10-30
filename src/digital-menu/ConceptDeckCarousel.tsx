import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useRef, useState } from 'react'
import { Camera, LayoutGrid, SlidersHorizontal, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { categories, type CategoryId } from '../data/menu'
import type { EnhancedMenuItem } from './adminStore'
import { MenuDishCard } from './MenuDishCard'

interface Props {
  items: EnhancedMenuItem[]
  tray: Record<string, number>
  onSelect: (item: EnhancedMenuItem) => void
  onAdd: (id: string) => void
  onRemove: (id: string) => void
}

export function ConceptDeckCarousel({
  items,
  tray,
  onSelect,
  onAdd,
  onRemove,
}: Props) {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('beverages')
  const [activeSection, setActiveSection] = useState<string>('all')
  const [onlyPhotos, setOnlyPhotos] = useState<boolean>(false)
  const [layoutMode, setLayoutMode] = useState<'carousel' | 'grid'>('carousel')
  const carouselRef = useRef<HTMLDivElement>(null)

  // Filter items for current category
  const categoryItems = useMemo(
    () => items.filter((m) => m.category === activeCategory),
    [items, activeCategory]
  )

  // Extract distinct sections in this category
  const availableSections = useMemo(() => {
    const set = new Set<string>()
    for (const item of categoryItems) {
      set.add(item.section)
    }
    return ['all', ...Array.from(set)]
  }, [categoryItems])

  // Count photos in current category
  const categoryPhotoCount = useMemo(
    () => categoryItems.filter((m) => !!m.image).length,
    [categoryItems]
  )

  // Filter by active section & photo filter
  const displayedItems = useMemo(() => {
    let list = categoryItems
    if (activeSection !== 'all') {
      list = list.filter((m) => m.section === activeSection)
    }
    if (onlyPhotos) {
      list = list.filter((m) => !!m.image)
    }
    return list
  }, [categoryItems, activeSection, onlyPhotos])

  const scrollByCard = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return
    const offset = direction === 'left' ? -320 : 320
    carouselRef.current.scrollBy({ left: offset, behavior: 'smooth' })
  }

  const activeCategoryMeta = categories.find((c) => c.id === activeCategory)!

  return (
    <div className="flex flex-col py-4">
      {/* Category Pills (Main Nav) */}
      <div className="px-3 sm:px-6">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
          {categories.map((c) => {
            const isCur = c.id === activeCategory
            const count = items.filter((m) => m.category === c.id).length
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActiveCategory(c.id)
                  setActiveSection('all')
                  setOnlyPhotos(false)
                  if (carouselRef.current) carouselRef.current.scrollLeft = 0
                }}
                className={`relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                  isCur ? 'text-espresso shadow-lg' : 'bg-ivory/8 text-ivory/70 hover:bg-ivory/15 hover:text-ivory'
                }`}
              >
                {isCur && (
                  <motion.span
                    layoutId="deck-category-bg"
                    className="absolute inset-0 rounded-full bg-bronze"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{c.short}</span>
                <span
                  className={`relative z-10 rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                    isCur ? 'bg-espresso text-bronze' : 'bg-ivory/10 text-ivory/60'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Category Description */}
        <p className="mt-2 text-xs leading-relaxed text-ivory/60">
          {activeCategoryMeta.blurb}
        </p>

        {/* Sub-Section Filter Chips + Photo Filter Toggle */}
        <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          {/* Photos only filter pill */}
          {categoryPhotoCount > 0 && (
            <button
              type="button"
              onClick={() => setOnlyPhotos((p) => !p)}
              className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-all ${
                onlyPhotos
                  ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                  : 'border-ivory/15 bg-ivory/5 text-ivory/70 hover:border-ivory/30'
              }`}
            >
              <Camera className="w-3 h-3 text-bronze" />
              <span>With In-Café Photos ({categoryPhotoCount})</span>
            </button>
          )}

          {availableSections.length > 2 && (
            <>
              <span className="text-[10px] uppercase font-mono tracking-wider text-ivory/40 mr-0.5 shrink-0">
                Sections:
              </span>
              {availableSections.map((sec) => {
                const active = sec === activeSection && !onlyPhotos
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      setActiveSection(sec)
                      setOnlyPhotos(false)
                      if (carouselRef.current) carouselRef.current.scrollLeft = 0
                    }}
                    className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-all ${
                      active
                        ? 'border-bronze bg-bronze/15 text-bronze font-bold'
                        : 'border-ivory/10 bg-ivory/5 text-ivory/70 hover:border-ivory/30'
                    }`}
                  >
                    {sec === 'all' ? 'All Items' : sec}
                  </button>
                )
              })}
            </>
          )}
        </div>
      </div>

      {/* Controls Bar: Items Count + Layout Switcher + Carousel Arrows */}
      <div className="mt-4 flex items-center justify-between px-3 sm:px-6">
        <span className="text-xs font-mono text-bronze flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-bronze" />
          <span>{displayedItems.length} dishes in view</span>
        </span>

        <div className="flex items-center gap-3">
          {/* Grid vs Carousel layout toggle */}
          <div className="flex items-center rounded-lg bg-ivory/10 p-0.5 border border-ivory/10">
            <button
              type="button"
              onClick={() => setLayoutMode('carousel')}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all ${
                layoutMode === 'carousel'
                  ? 'bg-bronze text-espresso font-bold'
                  : 'text-ivory/60 hover:text-ivory'
              }`}
              title="Carousel Mode"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span className="hidden sm:inline">Carousel</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('grid')}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all ${
                layoutMode === 'grid'
                  ? 'bg-bronze text-espresso font-bold'
                  : 'text-ivory/60 hover:text-ivory'
              }`}
              title="Grid Mode"
            >
              <LayoutGrid className="w-3 h-3" />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>

          {/* Carousel Arrows (only in carousel view) */}
          {layoutMode === 'carousel' && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollByCard('left')}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-ivory/15 bg-ivory/5 text-ivory/80 hover:bg-ivory/20 active:scale-95 transition-all"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollByCard('right')}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-ivory/15 bg-ivory/5 text-ivory/80 hover:bg-ivory/20 active:scale-95 transition-all"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Dishes Presentation: Carousel OR Responsive Grid */}
      {displayedItems.length === 0 ? (
        <div className="mx-3 mt-6 rounded-2xl border border-ivory/10 bg-ivory/5 p-8 text-center sm:mx-6">
          <Sparkles className="w-6 h-6 text-bronze mx-auto mb-2 opacity-60" />
          <p className="font-display text-base text-ivory">No dishes match the selected filter</p>
          <button
            type="button"
            onClick={() => {
              setActiveSection('all')
              setOnlyPhotos(false)
            }}
            className="mt-3 rounded-full border border-bronze/40 px-4 py-1 text-xs font-mono text-bronze hover:bg-bronze hover:text-espresso transition-colors"
          >
            Show All {activeCategoryMeta.short} Items
          </button>
        </div>
      ) : layoutMode === 'carousel' ? (
        <>
          <div
            ref={carouselRef}
            className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-3 py-2 sm:px-6"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            <AnimatePresence mode="popLayout">
              {displayedItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.25) }}
                  className="snap-start"
                >
                  <MenuDishCard
                    item={item}
                    quantityInTray={tray[item.id] ?? 0}
                    onSelect={onSelect}
                    onAdd={onAdd}
                    onRemove={onRemove}
                    compact={true}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Swipe Hint */}
          <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-ivory/40">
            <span>← Swipe horizontally to explore dishes →</span>
          </div>
        </>
      ) : (
        /* Grid Presentation */
        <div className="mt-3 grid grid-cols-2 gap-4 px-3 sm:grid-cols-2 lg:grid-cols-3 sm:px-6">
          <AnimatePresence mode="popLayout">
            {displayedItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.2) }}
              >
                <MenuDishCard
                  item={item}
                  quantityInTray={tray[item.id] ?? 0}
                  onSelect={onSelect}
                  onAdd={onAdd}
                  onRemove={onRemove}
                  compact={false}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
