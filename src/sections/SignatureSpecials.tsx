import { motion } from 'motion/react'
import { homepageSpecials, resolveHomepageSpecials, specials, type HomepageSpecialCard } from '../data/specials'
import { formatPrice, menuItems, type MenuItem } from '../data/menu'
import { useLiveMenu } from '../digital-menu/adminStore'
import { SectionHeading } from '../components/SectionHeading'
import { RevealImage } from '../components/RevealImage'
import { ConfirmFlag } from '../components/ConfirmFlag'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { EmberBackground } from '../components/EmberBackground'
import { EASE_OUT } from '../lib/motion'
import { useEffect, useRef, useState, type PointerEvent, type TouchEvent } from 'react'
import type { PublishedSpecials } from '../digital-menu/sanityContent'
import { fetchLocalDraftPreview, isLocalDraftPreviewRequested, type LocalDraftPreview } from '../digital-menu/sanityPreview'

interface Props {
  onSelect: (item: MenuItem) => void
}

/** Text panels for specials without a real photograph — never stock imagery */
const panelTones = ['bg-mocha', 'bg-espresso-2']
const pad = (n: number) => String(n).padStart(2, '0')

function SpecialCard({ item, index, total, tone, onSelect, slot, visible, stepVw, neighborScale, compact, reduceMotion }: { item: HomepageSpecialCard; index: number; total: number; tone: string; onSelect: (item: MenuItem) => void; slot: number; visible: boolean; stepVw: number; neighborScale: number; compact: boolean; reduceMotion: boolean }) {
  const menuItem = item.menuItem
  const accessible = visible && (!compact || slot === 0)
  const label = menuItem
    ? `${item.name}, ${formatPrice(menuItem.price)}${menuItem.needsConfirmation ? ' (details to be confirmed)' : ''} — view details`
    : item.name
  return (
    <motion.li
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${total}: ${item.name}`}
      aria-hidden={!accessible}
      inert={!accessible}
      data-slot={slot}
      className="specials-card"
      style={{ pointerEvents: accessible ? 'auto' : 'none' }}
      initial={false}
      animate={{
        x: `${slot * stepVw}vw`,
        scale: slot === 0 ? 1 : Math.abs(slot) === 1 ? neighborScale : 0.7,
        rotate: compact ? 0 : slot === 0 ? 0 : slot * -3,
        y: compact ? (slot === 0 ? 0 : 4) : slot === 0 ? 0 : Math.abs(slot) === 1 ? 12 : 25,
        opacity: visible ? (compact && slot !== 0 ? 0.78 : 1) : 0,
        zIndex: 5 - Math.abs(slot),
      }}
      transition={{ duration: reduceMotion ? 0 : 0.65, ease: EASE_OUT }}
    >
      <motion.article
        className="group relative flex h-full flex-col rounded-sm ring-bronze ring-offset-4 ring-offset-espresso-2 has-[button:focus-visible]:ring-2"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '0px 0px -8% 0px' }}
        transition={{ duration: 0.9, ease: EASE_OUT, delay: Math.min(index, 3) * 0.08 }}
      >
        <div className="relative overflow-hidden rounded-sm shadow-[0_26px_52px_-32px_rgba(0,0,0,0.72)] transition-[transform,box-shadow] duration-700 ease-[var(--ease-out-soft)] group-hover:-translate-y-1 group-hover:shadow-[0_34px_64px_-32px_rgba(0,0,0,0.78)] lg:h-[min(425px,calc(100svh-363px))]">
          {menuItem?.image ? (
            <RevealImage
              image={menuItem.image}
              className="aspect-[4/5] lg:aspect-auto lg:h-full"
              imgClassName="transition-transform duration-[1.4s] ease-[var(--ease-out-soft)] group-hover:scale-[1.05]"
            />
          ) : (
            <div className={`specials-card-placeholder relative flex aspect-[4/5] flex-col justify-end overflow-hidden p-7 text-ivory sm:p-8 lg:aspect-auto lg:h-full ${tone}`}>
              <div
                aria-hidden="true"
                className="specials-card-placeholder-ring absolute -top-16 -right-16 h-64 w-64 rounded-full border border-bronze/30 transition-transform duration-[1.4s] ease-[var(--ease-out-soft)] group-hover:scale-110"
              />
              <div
                aria-hidden="true"
                className="specials-card-placeholder-ring absolute -top-2 -right-2 h-40 w-40 rounded-full border border-bronze/20 transition-transform duration-[1.4s] ease-[var(--ease-out-soft)] group-hover:scale-125"
              />
              {menuItem?.section && <p className="label mb-3 text-bronze-light">From the menu</p>}
              <p aria-hidden="true" className="specials-card-placeholder-title display relative text-[clamp(2.4rem,4vw,3.4rem)] text-ivory italic">
                {menuItem?.section ?? item.name}
              </p>
            </div>
          )}
          <span className="glass label pointer-events-none absolute top-4 left-4 rounded-full px-3 py-1.5 text-ivory">{pad(index + 1)}</span>
        </div>

        <div className="specials-card-content flex flex-1 flex-col px-1 pt-6 lg:pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {menuItem?.section && <p className="label text-bronze">{menuItem.section}</p>}
              <h3 className="display mt-2 text-[1.9rem] leading-[1.05] sm:text-[2.1rem]">
                {menuItem ? (
                  <button
                    type="button"
                    onClick={() => onSelect(menuItem)}
                    aria-label={label}
                    className="text-left text-ivory after:absolute after:inset-0 after:rounded-sm after:content-[''] focus-visible:outline-none"
                  >
                    {item.name}
                  </button>
                ) : <span className="text-left text-ivory">{item.name}</span>}
              </h3>
            </div>
            {menuItem && <span className="display shrink-0 pt-5 text-[1.7rem] text-ivory-2">{formatPrice(menuItem.price)}</span>}
          </div>
          {/* Two-line slot keeps every card the same height */}
          <p aria-hidden={!menuItem?.description} className={`mt-3 lg:mt-2 line-clamp-2 min-h-[3.25em] text-sm leading-relaxed ${menuItem?.description ? 'text-ivory-2' : 'text-transparent'}`}>
            {menuItem?.description ?? '\u00a0'}
          </p>
          <div className="mt-5 lg:mt-2 flex items-center justify-between gap-3 border-t border-ivory/15 pt-4 lg:pt-2">
            {menuItem?.needsConfirmation ? <ConfirmFlag note={menuItem.needsConfirmation} tone="light" /> : <span />}
            {menuItem && (
              <span className="label inline-flex items-center gap-2 text-ivory/70 transition-colors group-hover:text-ivory">
                View details
                <span aria-hidden="true" className="transition-transform duration-500 group-hover:translate-x-1">
                  →
                </span>
              </span>
            )}
          </div>
        </div>
      </motion.article>
    </motion.li>
  )
}

function Arrow({ dir }: { dir: 'prev' | 'next' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        d={dir === 'prev' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SignatureSpecials({ onSelect }: Props) {
  const draftPreview = isLocalDraftPreviewRequested()
  const { items: liveMenuItems, dataSource, previewError, previewSummary } = useLiveMenu({ draftPreview })
  const [publishedSpecials, setPublishedSpecials] = useState<PublishedSpecials | null>(null)
  const [draftSpecials, setDraftSpecials] = useState<LocalDraftPreview['specials'] | null>(null)
  useEffect(() => {
    let active = true
    if (draftPreview) {
      const refreshDrafts = () => {
        void fetchLocalDraftPreview().then((result) => {
          if (active) setDraftSpecials((current) => JSON.stringify(current) === JSON.stringify(result.specials) ? current : result.specials)
        }).catch(() => {
          // The menu hook displays the preview error and keeps the existing published/JSON fallback available.
        })
      }
      refreshDrafts()
      const draftTimer = window.setInterval(refreshDrafts, 30_000)
      return () => { active = false; window.clearInterval(draftTimer) }
    }
    const refresh = () => {
      void import('../digital-menu/sanityContent').then(({ fetchPublishedSpecials }) => fetchPublishedSpecials()).then((result) => {
        if (active && result) setPublishedSpecials((current) => JSON.stringify(current) === JSON.stringify(result) ? current : result)
      }).catch(() => {
        if (active) setPublishedSpecials(null)
        // Use only the currently verified active menu-backed selection when published specials are unavailable.
      })
    }
    refresh()
    const timer = window.setInterval(refresh, 30_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [draftPreview])
  const remoteSpecialItems = draftPreview ? draftSpecials?.items : publishedSpecials?.items
  const remoteSelectionMatches = remoteSpecialItems?.length === homepageSpecials.length
    && remoteSpecialItems.every((item, index) => item.name.toLocaleLowerCase() === homepageSpecials[index].name.toLocaleLowerCase())
  const featuredItems: HomepageSpecialCard[] = remoteSelectionMatches && remoteSpecialItems
    ? remoteSpecialItems.map((menuItem, index) => ({
        id: homepageSpecials[index].id,
        name: homepageSpecials[index].name,
        menuItem,
      }))
    : resolveHomepageSpecials([...liveMenuItems, ...menuItems])
  const total = featuredItems.length
  const [activeIndex, setActiveIndex] = useState(0)
  const step = (direction: 1 | -1) => setActiveIndex((current) => (current + direction + total) % total)
  const supportsEdgePointer = useMediaQuery('(hover: hover) and (pointer: fine)')
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const compact = useMediaQuery('(max-width: 639px)')
  const tablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)')
  const edgePointer = useRef({ x: 0, armed: true })
  const edgeAdvanceTimer = useRef<number | null>(null)
  const pendingEdgeDirection = useRef<1 | -1 | 0>(0)
  const touchStartX = useRef<number | null>(null)
  let typographic = 0
  const tones = featuredItems.map((item) => (item.menuItem?.image ? '' : panelTones[typographic++ % panelTones.length]))
  const visibleSlots = compact || tablet ? 1 : 2
  const stepVw = compact ? 43 : tablet ? 31 : 21
  const canScroll = total > 1

  useEffect(() => () => {
    if (edgeAdvanceTimer.current !== null) window.clearTimeout(edgeAdvanceTimer.current)
  }, [])

  const handlePointerMove = (event: PointerEvent<HTMLUListElement>) => {
    const track = event.currentTarget
    const bounds = track.getBoundingClientRect()
    const x = event.clientX - bounds.left
    const delta = x - edgePointer.current.x
    edgePointer.current.x = x
    if (!supportsEdgePointer || reduceMotion || event.pointerType !== 'mouse' || track.dataset.dragging) return

    const zone = Math.min(64, bounds.width * 0.09)
    if (x > zone * 1.6 && x < bounds.width - zone * 1.6) edgePointer.current.armed = true

    const direction: -1 | 0 | 1 = x <= zone ? -1 : x >= bounds.width - zone ? 1 : 0
    if (!direction) {
      cancelEdgeAdvance()
      return
    }
    if (edgeAdvanceTimer.current !== null && pendingEdgeDirection.current !== direction) {
      cancelEdgeAdvance()
      edgePointer.current.armed = true
    }
    if ((event.target as HTMLElement).closest('[aria-roledescription="slide"]')) {
      cancelEdgeAdvance()
      return
    }
    if (edgePointer.current.armed === false) return
    if ((direction < 0 && delta > -6) || (direction > 0 && delta < 6)) return

    edgePointer.current.armed = false
    pendingEdgeDirection.current = direction
    edgeAdvanceTimer.current = window.setTimeout(() => {
      edgeAdvanceTimer.current = null
      pendingEdgeDirection.current = 0
      step(direction)
    }, 160)
  }

  const cancelEdgeAdvance = () => {
    if (edgeAdvanceTimer.current !== null) window.clearTimeout(edgeAdvanceTimer.current)
    edgeAdvanceTimer.current = null
    pendingEdgeDirection.current = 0
  }

  const handleTouchStart = (event: TouchEvent<HTMLUListElement>) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null
    cancelEdgeAdvance()
  }

  const handleTouchEnd = (event: TouchEvent<HTMLUListElement>) => {
    const start = touchStartX.current
    touchStartX.current = null
    const end = event.changedTouches[0]?.clientX
    if (start === null || end === undefined || Math.abs(end - start) < 44) return
    step(end < start ? 1 : -1)
  }

  return (
    <section id="specials" aria-labelledby="specials-title" className="relative isolate overflow-hidden bg-espresso-2 py-16 text-ivory sm:py-20 lg:py-20">
      <EmberBackground strength="warm" />
      <div className="container-x relative z-10">
        <SectionHeading id="specials-title" eyebrow={publishedSpecials?.eyebrow ?? specials.eyebrow} title="There's always room for something special." />
        {draftPreview && (
          <p role={previewError ? 'alert' : 'status'} className={`mt-4 text-sm ${previewError ? 'text-amber-200' : 'text-ivory-2/75'}`}>
            {previewError
              ? `Local Sanity draft preview unavailable: ${previewError}`
              : dataSource === 'sanity-preview' && previewSummary
                ? `Local draft preview · ${previewSummary.realSpecialReferences} menu references · ${previewSummary.temporarySpecialEntries} temporary entries · ${previewSummary.imageAssetCount} images`
                : 'Loading authenticated Sanity drafts for local preview…'}
          </p>
        )}
      </div>

      <div role="region" aria-roledescription="carousel" aria-label="Signature specials" className="relative z-10 mx-auto mt-8 w-full max-w-[1200px] sm:mt-10 lg:mt-8">
        <ul
          tabIndex={0}
          aria-label="Signature specials — use the left and right arrow keys or swipe to browse"
          className="specials-track no-scrollbar focus-visible:outline-offset-[-2px]"
          onPointerEnter={(event) => { edgePointer.current.x = event.clientX - event.currentTarget.getBoundingClientRect().left }}
          onPointerLeave={() => { cancelEdgeAdvance(); edgePointer.current.x = 0; edgePointer.current.armed = true }}
          onPointerDown={cancelEdgeAdvance}
          onPointerMove={handlePointerMove}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault()
              step(1)
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault()
              step(-1)
            }
          }}
        >
          {featuredItems.map((item, i) => (
            <SpecialCard
              key={item.id}
              item={item}
              index={i}
              total={total}
              tone={tones[i]}
              onSelect={onSelect}
              slot={((i - activeIndex + total + Math.floor(total / 2)) % total) - Math.floor(total / 2)}
              visible={Math.abs(((i - activeIndex + total + Math.floor(total / 2)) % total) - Math.floor(total / 2)) <= visibleSlots}
              stepVw={stepVw}
              neighborScale={compact ? 0.96 : 0.84}
              compact={compact}
              reduceMotion={reduceMotion}
            />
          ))}
        </ul>

        <div className={`mt-3 flex justify-center gap-3 sm:mt-4 lg:mt-2 ${canScroll ? '' : 'invisible'}`}>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous specials"
            className="glass glass-control text-ivory"
          >
            <Arrow dir="prev" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next specials"
            className="glass glass-control text-ivory"
          >
            <Arrow dir="next" />
          </button>
        </div>

        <div className="container-x mt-3 flex items-center gap-5 sm:mt-4 lg:mt-3">
          <p className="label shrink-0 text-ivory-2 tabular-nums" aria-live="polite">
            <span className="sr-only">Showing </span>
            {pad(activeIndex + 1)} <span className="text-ivory/45">/ {pad(total)}</span>
          </p>
          {/* Position track marks the centred product */}
          <div aria-hidden="true" className="relative h-px flex-1 bg-ivory/15">
            <span
              className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full bg-bronze-deep transition-[transform] duration-300 ease-out"
              style={{
                width: `${100 / total}%`,
                transform: `translate(${activeIndex * 100}%, -50%)`,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
