import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { navLinks } from '../data/nav'
import { business } from '../data/business'
import { useActiveSection } from '../hooks/useActiveSection'
import { useScrollLock } from '../hooks/useScrollLock'
import { trapTab } from '../lib/focusTrap'
import { EASE_CINEMA, EASE_OUT } from '../lib/motion'
import { scrollToId } from '../lib/scroll'
import { Wordmark } from './Wordmark'

// Observe every section so the highlight clears over sections without a nav link
const sectionIds = ['top', 'specials', 'menu', 'story', 'gallery', 'reviews', 'visit']

export function Navbar() {
  const [scrolled, setScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > 40)
  const [open, setOpen] = useState(false)
  const active = useActiveSection(sectionIds)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  useScrollLock(open)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      mobileMenuRef.current?.querySelector<HTMLElement>('a[href]')?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Close the mobile menu if the viewport grows to desktop
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    const onChange = () => mql.matches && setOpen(false)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  const go = (id: string) => (e: MouseEvent) => {
    e.preventDefault()
    const wasOpen = open
    setOpen(false)
    if (wasOpen) toggleRef.current?.focus()
    // let the overlay release the scroll lock before scrolling
    window.setTimeout(() => scrollToId(id), wasOpen ? (reduceMotion ? 50 : 320) : 0)
  }

  return (
    <header
      onKeyDown={(e) => open && trapTab(mobileMenuRef.current, e)}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div className="container-x">
      <nav
        aria-label="Primary"
        className={`flex h-16 items-center justify-between rounded-full transition-[background-color,border-color,box-shadow,margin,padding] duration-500 ease-[var(--ease-out-soft)] ${
          scrolled && !open ? 'glass glass-nav mt-2 -mx-2 pr-2 pl-4 sm:-mx-3 sm:pl-5 lg:mt-3' : 'glass glass-nav mt-1 border border-ivory/10 pr-2 pl-4 sm:pl-5 lg:mt-2 lg:h-[72px]'
        }`}
      >
        <a href="#top" onClick={go('top')} className="relative z-10 text-lg text-ivory sm:text-xl">
          <Wordmark />
        </a>

        <ul className="hidden items-center gap-9 lg:flex">
          {navLinks.map((l) => (
            <li key={l.id}>
              <a
                href={`#${l.id}`}
                onClick={go(l.id)}
                aria-current={active === l.id ? 'true' : undefined}
                className={`link-underline label py-1 transition-colors ${active === l.id ? 'text-ivory' : 'text-ivory/75 hover:text-ivory'}`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, '', '?view=menu')
              window.dispatchEvent(new Event('popstate'))
            }}
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border border-bronze/40 bg-bronze/10 px-3.5 py-2 text-xs font-semibold tracking-wider text-bronze uppercase hover:bg-bronze hover:text-espresso transition-all ${open ? 'invisible' : ''}`}
            title="Open the In-Café QR Digital Menu"
          >
            <span>📱 In-Café Menu</span>
          </button>
          <a href="#menu" onClick={go('menu')} className={`btn btn-primary hidden min-h-11 sm:inline-flex ${open ? 'invisible' : ''}`}>
            Explore Menu
          </a>
          <button
            ref={toggleRef}
            type="button"
            className="glass-control relative z-10 border border-ivory/20 bg-ivory/5 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="relative block h-3 w-5">
              <span
                className={`absolute left-0 h-px w-5 bg-ivory transition-transform duration-500 ease-[var(--ease-cinema)] ${
                  open ? 'top-1.5 rotate-45' : 'top-0'
                }`}
              />
              <span
                className={`absolute left-0 h-px bg-ivory transition-all duration-500 ease-[var(--ease-cinema)] ${
                  open ? 'top-1.5 w-5 -rotate-45' : 'top-3 w-3'
                }`}
              />
            </span>
          </button>
        </div>
      </nav>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={mobileMenuRef}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="glass-sheet fixed inset-0 z-0 flex flex-col lg:hidden"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: EASE_CINEMA }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ background: 'radial-gradient(80% 60% at 80% 0%, rgba(117,81,61,0.2), transparent 60%)' }}
            />
            <motion.ul
              className="container-x relative mt-28 flex flex-col"
              initial="hidden"
              animate="show"
              exit="hidden"
              variants={{ hidden: {}, show: { transition: { staggerChildren: reduceMotion ? 0 : 0.05, delayChildren: reduceMotion ? 0 : 0.08 } } }}
            >
              {navLinks.map((l, i) => (
                <li key={l.id} className="overflow-hidden border-b border-ivory/10">
                  <motion.a
                    href={`#${l.id}`}
                    onClick={go(l.id)}
                    className="display flex min-h-16 items-baseline gap-4 py-3 text-[clamp(2.4rem,12vw,4.5rem)] text-ivory transition-colors active:text-bronze-light"
                    variants={{ hidden: { y: reduceMotion ? '0%' : '100%' }, show: { y: '0%', transition: { duration: reduceMotion ? 0 : 0.45, ease: EASE_OUT } } }}
                  >
                    <span className="label text-bronze">0{i + 1}</span>
                    {l.label}
                  </motion.a>
                </li>
              ))}
            </motion.ul>
            <motion.div
              className="container-x relative mt-auto mb-10 flex flex-col gap-5"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: reduceMotion ? 0 : 0.2, duration: reduceMotion ? 0 : 0.4 } }}
              exit={{ opacity: 0 }}
            >
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  window.history.pushState({}, '', '?view=menu')
                  window.dispatchEvent(new Event('popstate'))
                }}
                className="btn btn-ghost w-full border border-bronze/40 text-bronze uppercase tracking-wider text-xs"
              >
                📱 Open In-Café QR Menu
              </button>
              <a href="#menu" onClick={go('menu')} className="btn btn-primary w-full">
                Explore Menu
              </a>
              <p className="label text-center text-ivory/50">{business.tagline}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
