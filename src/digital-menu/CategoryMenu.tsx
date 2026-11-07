import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { MenuCategory } from '../data/menu'
import type { EnhancedMenuItem } from './adminStore'
import { InCafeMenuItemRow } from './InCafeMenuItemRow'

interface Props {
  categories: MenuCategory[]
  items: EnhancedMenuItem[]
  tray: Record<string, number>
  onSelect: (item: EnhancedMenuItem) => void
  onAdd: (id: string) => void
  onRemove: (id: string) => void
}

interface MenuSubcategory {
  id: string
  label: string
  items: EnhancedMenuItem[]
}

function getSubcategoryId(categoryId: string, section: string) {
  const sectionId = section.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `menu-subcategory-${categoryId}-${sectionId || 'section'}`
}

export function CategoryMenu({ categories, items, tray, onSelect, onAdd, onRemove }: Props) {
  const categorySectionRefs = useRef(new Map<string, HTMLElement>())
  const subcategorySectionRefs = useRef(new Map<string, HTMLElement>())
  const categoryButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const subcategoryButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const categoryNavRef = useRef<HTMLElement>(null)
  const subcategoryNavRef = useRef<HTMLElement>(null)
  const navigationRef = useRef<HTMLDivElement>(null)
  const scrollFrameRef = useRef<number | null>(null)
  const pendingTargetRef = useRef<{ categoryId: string; subcategoryId?: string } | null>(null)
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const manuallyCollapsedCategoryRef = useRef<string | null>(null)

  const itemsByCategory = useMemo(() => {
    const grouped = new Map<string, EnhancedMenuItem[]>()
    for (const item of items) {
      const existing = grouped.get(item.category) ?? []
      existing.push(item)
      grouped.set(item.category, existing)
    }
    return grouped
  }, [items])

  const subcategoriesByCategory = useMemo(() => {
    const grouped = new Map<string, MenuSubcategory[]>()
    for (const category of categories) {
      const sections = new Map<string, EnhancedMenuItem[]>()
      for (const item of itemsByCategory.get(category.id) ?? []) {
        const sectionItems = sections.get(item.section) ?? []
        sectionItems.push(item)
        sections.set(item.section, sectionItems)
      }
      grouped.set(category.id, [...sections].map(([label, sectionItems]) => ({
        id: getSubcategoryId(category.id, label),
        label,
        items: sectionItems,
      })))
    }
    return grouped
  }, [categories, itemsByCategory])

  const [activeCategory, setActiveCategory] = useState<string | null>(categories[0]?.id ?? null)
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const currentCategory = categories.some((category) => category.id === activeCategory)
    ? activeCategory
    : categories[0]?.id ?? null
  const openCategory = expandedCategory && categories.some((category) => category.id === expandedCategory)
    && (subcategoriesByCategory.get(expandedCategory)?.length ?? 0) > 0
    ? expandedCategory
    : null

  useEffect(() => {
    const updateActiveFromScroll = () => {
      scrollFrameRef.current = null
      if (!categories.length) return

      const compactNavigation = window.matchMedia('(max-width: 1023px)').matches
      const header = document.querySelector('.digital-menu-theme > header')
      const headerBottom = header?.getBoundingClientRect().bottom ?? 0
      let activationLine = headerBottom + 16

      if (compactNavigation) {
        const navigation = navigationRef.current?.getBoundingClientRect()
        if (navigation && navigation.top <= headerBottom + 8) activationLine = navigation.bottom + 8
      }

      const categoryIndex = categories.reduce((latestIndex, category, index) => {
        const section = categorySectionRefs.current.get(category.id)
        return section && section.getBoundingClientRect().top <= activationLine ? index : latestIndex
      }, 0)
      const category = categories[categoryIndex]
      if (!category) return

      const subcategories = subcategoriesByCategory.get(category.id) ?? []
      const subcategory = [...subcategories].reverse().find((entry) => {
        const section = subcategorySectionRefs.current.get(entry.id)
        return section && section.getBoundingClientRect().top <= activationLine
      })

      const pending = pendingTargetRef.current
      if (pending) {
        const target = pending.subcategoryId
          ? subcategorySectionRefs.current.get(pending.subcategoryId)
          : categorySectionRefs.current.get(pending.categoryId)
        if (target) {
          const bounds = target.getBoundingClientRect()
          if (bounds.top > activationLine + 36 || bounds.bottom <= activationLine) {
            setActiveCategory(pending.categoryId)
            setActiveSubcategory(pending.subcategoryId ?? null)
            setExpandedCategory(pending.categoryId)
            return
          }
        }
        pendingTargetRef.current = null
        if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
        pendingTimerRef.current = null
      }

      const manuallyCollapsed = manuallyCollapsedCategoryRef.current === category.id
      if (manuallyCollapsedCategoryRef.current && category.id !== manuallyCollapsedCategoryRef.current) {
        manuallyCollapsedCategoryRef.current = null
      }
      setActiveCategory((current) => current === category.id ? current : category.id)
      setActiveSubcategory((current) => {
        const next = manuallyCollapsed ? null : subcategory?.id ?? null
        return current === next ? current : next
      })
      setExpandedCategory((current) => {
        if (manuallyCollapsed) return null
        if (window.scrollY <= 50 && current === null) return null
        const next = subcategories.length ? category.id : null
        return current === next ? current : next
      })
    }

    const scheduleUpdate = () => {
      if (scrollFrameRef.current !== null) return
      scrollFrameRef.current = window.requestAnimationFrame(updateActiveFromScroll)
    }

    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    scheduleUpdate()
    return () => {
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current)
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    }
  }, [categories, subcategoriesByCategory])

  const centerButtonInNav = (nav: HTMLElement | null, button: HTMLButtonElement | undefined) => {
    if (!nav || !button || !window.matchMedia('(max-width: 1023px)').matches) return
    const buttonRect = button.getBoundingClientRect()
    const navRect = nav.getBoundingClientRect()
    nav.scrollTo({
      left: nav.scrollLeft + buttonRect.left - navRect.left - (nav.clientWidth - button.clientWidth) / 2,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }

  const prepareNavigation = (categoryId: string, subcategoryId?: string) => {
    pendingTargetRef.current = { categoryId, subcategoryId }
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    pendingTimerRef.current = setTimeout(() => {
      pendingTargetRef.current = null
      pendingTimerRef.current = null
    }, 1800)
    setActiveCategory(categoryId)
    setActiveSubcategory(subcategoryId ?? null)
    setExpandedCategory(categoryId)

    window.requestAnimationFrame(() => {
      if (subcategoryId) {
        const subcategory = subcategoryButtonRefs.current.get(subcategoryId)
        centerButtonInNav(subcategoryNavRef.current, subcategory)
        subcategorySectionRefs.current.get(subcategoryId)?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          block: 'start',
        })
      } else {
        const categoryButton = categoryButtonRefs.current.get(categoryId)
        centerButtonInNav(categoryNavRef.current, categoryButton)
        categorySectionRefs.current.get(categoryId)?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          block: 'start',
        })
      }
    })
  }

  const selectCategory = (categoryId: string) => {
    const hasSubcategories = (subcategoriesByCategory.get(categoryId)?.length ?? 0) > 0
    if (!hasSubcategories) {
      manuallyCollapsedCategoryRef.current = null
      setExpandedCategory(null)
      pendingTargetRef.current = { categoryId }
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
      pendingTimerRef.current = setTimeout(() => {
        pendingTargetRef.current = null
        pendingTimerRef.current = null
      }, 1800)
      setActiveCategory(categoryId)
      setActiveSubcategory(null)
      window.requestAnimationFrame(() => {
        centerButtonInNav(categoryNavRef.current, categoryButtonRefs.current.get(categoryId))
        categorySectionRefs.current.get(categoryId)?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          block: 'start',
        })
      })
      return
    }
    if (openCategory === categoryId) {
      manuallyCollapsedCategoryRef.current = categoryId
      setExpandedCategory(null)
      setActiveCategory(categoryId)
      setActiveSubcategory(null)
      return
    }
    manuallyCollapsedCategoryRef.current = null
    prepareNavigation(categoryId)
  }

  const renderSubcategoryButtons = (categoryId: string, mobile: boolean) => (
    <ul>
      {(subcategoriesByCategory.get(categoryId) ?? []).map((subcategory) => (
        <li key={subcategory.id}>
          <button
            ref={mobile ? (element) => {
              if (element) subcategoryButtonRefs.current.set(subcategory.id, element)
              else subcategoryButtonRefs.current.delete(subcategory.id)
            } : undefined}
            type="button"
            aria-current={activeSubcategory === subcategory.id ? 'location' : undefined}
            aria-controls={subcategory.id}
            onClick={() => prepareNavigation(categoryId, subcategory.id)}
          >
            <span>{subcategory.label}</span>
            <span className="digital-menu-subcategory-nav__count" aria-label={`${subcategory.items.length} items`}>
              {subcategory.items.length}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <div className={`digital-menu-browse${openCategory ? ' has-expanded-subcategories' : ''}`}>
      <div ref={navigationRef} className="digital-menu-category-navigation">
        <nav ref={categoryNavRef} className="digital-menu-category-nav digital-menu-category-nav--mobile" aria-label="Menu categories">
          <ul>
            {categories.map((category) => {
              const count = itemsByCategory.get(category.id)?.length ?? 0
              const hasSubcategories = (subcategoriesByCategory.get(category.id)?.length ?? 0) > 0
              const isActive = currentCategory === category.id
              return (
                <li key={category.id}>
                  <button
                    ref={(element) => {
                      if (element) categoryButtonRefs.current.set(category.id, element)
                      else categoryButtonRefs.current.delete(category.id)
                    }}
                    type="button"
                    aria-current={isActive ? 'location' : undefined}
                    aria-expanded={hasSubcategories ? openCategory === category.id : undefined}
                    aria-controls={hasSubcategories ? `menu-mobile-subcategories-${category.id}` : `menu-category-${category.id}`}
                    onClick={() => selectCategory(category.id)}
                  >
                    <span>{category.label}</span>
                    <span className="digital-menu-category-nav__count" aria-label={`${count} items`}>{count}</span>
                    {hasSubcategories && <ChevronDown aria-hidden="true" className={`digital-menu-category-nav__chevron${openCategory === category.id ? ' is-open' : ''}`} size={14} />}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {openCategory && (
          <nav
            ref={subcategoryNavRef}
            className="digital-menu-subcategory-nav digital-menu-subcategory-nav--mobile"
            id={`menu-mobile-subcategories-${openCategory}`}
            aria-label={`${categories.find((category) => category.id === openCategory)?.label ?? 'Menu'} subcategories`}
          >
            {renderSubcategoryButtons(openCategory, true)}
          </nav>
        )}

        <nav className="digital-menu-category-nav digital-menu-category-nav--desktop" aria-label="Menu categories">
          <ul>
            {categories.map((category) => {
              const count = itemsByCategory.get(category.id)?.length ?? 0
              const subcategories = subcategoriesByCategory.get(category.id) ?? []
              const hasSubcategories = subcategories.length > 0
              const isExpanded = openCategory === category.id
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    aria-current={currentCategory === category.id ? 'location' : undefined}
                    aria-expanded={hasSubcategories ? isExpanded : undefined}
                    aria-controls={hasSubcategories ? `menu-desktop-subcategories-${category.id}` : `menu-category-${category.id}`}
                    onClick={() => selectCategory(category.id)}
                  >
                    <span>{category.label}</span>
                    <span className="digital-menu-category-nav__count" aria-label={`${count} items`}>{count}</span>
                    {hasSubcategories && <ChevronDown aria-hidden="true" className={`digital-menu-category-nav__chevron${isExpanded ? ' is-open' : ''}`} size={14} />}
                  </button>
                  {hasSubcategories && (
                    <div
                      className={`digital-menu-subcategory-panel${isExpanded ? ' is-open' : ''}`}
                      id={`menu-desktop-subcategories-${category.id}`}
                      aria-hidden={!isExpanded}
                      inert={!isExpanded}
                    >
                      <nav className="digital-menu-subcategory-nav" aria-label={`${category.label} subcategories`}>
                        {renderSubcategoryButtons(category.id, false)}
                      </nav>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      <div className="digital-menu-categories">
        {categories.map((category) => {
          const categoryItemsForSection = itemsByCategory.get(category.id) ?? []
          const subcategories = subcategoriesByCategory.get(category.id) ?? []
          return (
            <section
              className="digital-menu-category"
              key={category.id}
              id={`menu-category-${category.id}`}
              data-menu-category={category.id}
              aria-labelledby={`menu-category-heading-${category.id}`}
              ref={(element) => {
                if (element) categorySectionRefs.current.set(category.id, element)
                else categorySectionRefs.current.delete(category.id)
              }}
            >
              <header className="digital-menu-category__heading">
                <div>
                  <h2 id={`menu-category-heading-${category.id}`}>{category.label}</h2>
                  {category.blurb && <p>{category.blurb}</p>}
                </div>
                <span aria-label={`${categoryItemsForSection.length} items`}>{categoryItemsForSection.length}</span>
              </header>

              {subcategories.length ? (
                <div className="digital-menu-category__subcategories">
                  {subcategories.map((subcategory) => (
                    <section
                      className="digital-menu-subcategory"
                      key={subcategory.id}
                      id={subcategory.id}
                      data-menu-subcategory={subcategory.id}
                      aria-labelledby={`${subcategory.id}-heading`}
                      ref={(element) => {
                        if (element) subcategorySectionRefs.current.set(subcategory.id, element)
                        else subcategorySectionRefs.current.delete(subcategory.id)
                      }}
                    >
                      <h3 id={`${subcategory.id}-heading`}>{subcategory.label}</h3>
                      <div className="digital-menu-category__items">
                        {subcategory.items.map((item) => (
                          <InCafeMenuItemRow
                            key={item.id}
                            item={item}
                            quantityInTray={tray[item.id] ?? 0}
                            onSelect={onSelect}
                            onAdd={onAdd}
                            onRemove={onRemove}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : categoryItemsForSection.length ? (
                <div className="digital-menu-category__items">
                  {categoryItemsForSection.map((item) => (
                    <InCafeMenuItemRow
                      key={item.id}
                      item={item}
                      quantityInTray={tray[item.id] ?? 0}
                      onSelect={onSelect}
                      onAdd={onAdd}
                      onRemove={onRemove}
                    />
                  ))}
                </div>
              ) : (
                <p className="digital-menu-category__empty">No items are currently listed in this category.</p>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
