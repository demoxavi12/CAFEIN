import { useCallback, useEffect, useRef, useState } from 'react'
import { useMediaQuery } from './useMediaQuery'

export interface CarouselState {
  /** First and last (0-based) slide that is mostly visible */
  first: number
  last: number
  atStart: boolean
  atEnd: boolean
  /** 0–1 scroll progress and the visible fraction, for the progress track */
  progress: number
  visible: number
}

const EDGE = 4
const DRAG_THRESHOLD = 6

/**
 * Native scroll-snap carousel controller. Touch, trackpad and keyboard use the
 * browser's own scrolling; this adds arrow stops, position state and
 * mouse drag-to-scroll (mouse only — touch stays native).
 */
export function useCarousel(count: number) {
  const trackRef = useRef<HTMLUListElement>(null)
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [state, setState] = useState<CarouselState>({
    first: 0,
    last: 0,
    atStart: true,
    atEnd: count <= 1,
    progress: 0,
    visible: 1,
  })

  /** Centered scroll offsets for each slide, clamped to what is reachable */
  const stops = useCallback(() => {
    const track = trackRef.current
    if (!track) return []
    const slides = Array.from(track.children) as HTMLElement[]
    if (!slides.length) return []
    const max = track.scrollWidth - track.clientWidth
    const origin = slides[0].offsetLeft
    return slides.map((slide) => {
      const relativeLeft = slide.offsetLeft - origin
      const centeredLeft = relativeLeft + slide.offsetWidth / 2 - track.clientWidth / 2
      return Math.min(Math.max(0, centeredLeft), max)
    })
  }, [])

  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const slides = Array.from(track.children) as HTMLElement[]
    const box = track.getBoundingClientRect()
    const shown = slides
      .map((s, i) => {
        const r = s.getBoundingClientRect()
        const overlap = Math.min(r.right, box.right) - Math.max(r.left, box.left)
        return overlap / r.width > 0.6 ? i : -1
      })
      .filter((i) => i >= 0)
    const max = track.scrollWidth - track.clientWidth
    const next: CarouselState = {
      first: shown[0] ?? 0,
      last: shown[shown.length - 1] ?? 0,
      atStart: track.scrollLeft <= EDGE,
      atEnd: track.scrollLeft >= max - EDGE,
      progress: max > 0 ? track.scrollLeft / max : 0,
      visible: track.scrollWidth > 0 ? Math.min(1, track.clientWidth / track.scrollWidth) : 1,
    }
    setState((prev) =>
      prev.first === next.first &&
      prev.last === next.last &&
      prev.atStart === next.atStart &&
      prev.atEnd === next.atEnd &&
      Math.abs(prev.progress - next.progress) < 0.002 &&
      Math.abs(prev.visible - next.visible) < 0.002
        ? prev
        : next,
    )
  }, [])

  const scrollToOffset = useCallback(
    (left: number) => trackRef.current?.scrollTo({ left, behavior: reduce ? 'auto' : 'smooth' }),
    [reduce],
  )

  const step = useCallback(
    (dir: 1 | -1) => {
      const track = trackRef.current
      if (!track) return
      const x = track.scrollLeft
      const s = stops()
      const target = dir > 0 ? s.find((v) => v > x + EDGE) : [...s].reverse().find((v) => v < x - EDGE)
      if (target !== undefined) scrollToOffset(target)
    },
    [stops, scrollToOffset],
  )

  const goTo = useCallback((i: number) => scrollToOffset(stops()[i] ?? 0), [stops, scrollToOffset])

  // Keep state in sync with scrolling and resizing
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }
    measure()
    track.addEventListener('scroll', onScroll, { passive: true })
    const ro = new ResizeObserver(onScroll)
    ro.observe(track)
    return () => {
      cancelAnimationFrame(raf)
      track.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [measure, count])

  // Mouse drag-to-scroll; snapping is paused while dragging and restored after
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let startX = 0
    let startLeft = 0
    let pointerId = -1
    let dragging = false

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      pointerId = e.pointerId
      startX = e.clientX
      startLeft = track.scrollLeft
      dragging = false
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      const dx = e.clientX - startX
      if (!dragging && Math.abs(dx) > DRAG_THRESHOLD) {
        dragging = true
        track.setPointerCapture(pointerId)
        track.dataset.dragging = 'true'
      }
      if (dragging) track.scrollLeft = startLeft - dx
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      pointerId = -1
      if (!dragging) return
      dragging = false
      delete track.dataset.dragging
      // swallow the click that ends a drag so cards don't open (expires if no click follows)
      const swallow = (ev: MouseEvent) => {
        ev.preventDefault()
        ev.stopPropagation()
      }
      track.addEventListener('click', swallow, { capture: true, once: true })
      window.setTimeout(() => track.removeEventListener('click', swallow, { capture: true }), 80)
      const x = track.scrollLeft
      const nearest = stops().reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a), 0)
      scrollToOffset(nearest)
    }
    track.addEventListener('pointerdown', onDown)
    track.addEventListener('pointermove', onMove)
    track.addEventListener('pointerup', onUp)
    track.addEventListener('pointercancel', onUp)
    return () => {
      track.removeEventListener('pointerdown', onDown)
      track.removeEventListener('pointermove', onMove)
      track.removeEventListener('pointerup', onUp)
      track.removeEventListener('pointercancel', onUp)
    }
  }, [stops, scrollToOffset])

  return { trackRef, state, step, goTo }
}
