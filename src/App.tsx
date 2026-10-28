import { lazy, Suspense, useEffect, useState } from 'react'
import { LayoutGroup, MotionConfig } from 'motion/react'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { IntroAnimation } from './components/IntroAnimation'
import { ProductDetailModal } from './components/ProductDetailModal'
import { HeroSection } from './sections/HeroSection'
import { SignatureSpecials } from './sections/SignatureSpecials'
import { MenuSection } from './sections/MenuSection'
import { AboutSection } from './sections/AboutSection'
import { GallerySection } from './sections/GallerySection'
import { ReviewsSection } from './sections/ReviewsSection'
import { VisitUsSection } from './sections/VisitUsSection'
import { initSmoothScroll, scrollToId } from './lib/scroll'
import { IntroContext } from './lib/intro'
import type { MenuItem } from './data/menu'

const DigitalMenuView = lazy(() =>
  import('./digital-menu/DigitalMenuView').then(({ DigitalMenuView }) => ({ default: DigitalMenuView })),
)

function checkIsDigitalMenu(): boolean {
  if (typeof window === 'undefined') return false

  const path = window.location.pathname.toLowerCase()
  const search = window.location.search.toLowerCase()
  const hash = window.location.hash.toLowerCase()

  return (
    path === '/menu' ||
    path.startsWith('/menu/') ||
    path === '/digital-menu' ||
    search.includes('view=menu') ||
    search.includes('menu=qr') ||
    hash === '#digital-menu' ||
    hash === '#/menu' ||
    hash === '#menu-qr'
  )
}

export default function App() {
  const [selected, setSelected] = useState<MenuItem | null>(null)
  const [isDigitalMenu, setIsDigitalMenu] = useState(checkIsDigitalMenu)
  const [introVisible, setIntroVisible] = useState(() => !checkIsDigitalMenu())
  const [heroReady, setHeroReady] = useState(false)

  useEffect(() => {
    const handleLocationChange = () => {
      const nextIsDigitalMenu = checkIsDigitalMenu()
      setIsDigitalMenu(nextIsDigitalMenu)
      if (!nextIsDigitalMenu) {
        // Returning from the standalone menu is in-page navigation, so show the
        // completed showcase without replaying its full-page intro.
        setIntroVisible(false)
        setHeroReady(true)
      }
    }

    window.addEventListener('popstate', handleLocationChange)
    window.addEventListener('hashchange', handleLocationChange)
    return () => {
      window.removeEventListener('popstate', handleLocationChange)
      window.removeEventListener('hashchange', handleLocationChange)
    }
  }, [])

  useEffect(() => {
    if (isDigitalMenu) return
    return initSmoothScroll()
  }, [isDigitalMenu])

  // Honour deep links such as /#menu once content has rendered.
  useEffect(() => {
    if (isDigitalMenu) return

    const id = window.location.hash.slice(1)
    if (!id || id === 'digital-menu' || id === '/menu') return

    let cancelled = false
    const fonts = document.fonts?.ready ?? Promise.resolve()

    fonts.then(() =>
      requestAnimationFrame(() => {
        if (!cancelled) scrollToId(id, { immediate: true })
      }),
    )

    return () => {
      cancelled = true
    }
  }, [isDigitalMenu])

  if (isDigitalMenu) {
    return (
      <MotionConfig reducedMotion="user">
        <Suspense fallback={<div className="min-h-screen bg-espresso" aria-busy="true" aria-label="Loading Cafe In menu" />}>
          <DigitalMenuView
            onExitMenu={() => {
              const path = window.location.pathname.toLowerCase()
              const showcasePath = path === '/menu' || path.startsWith('/menu/') || path === '/digital-menu'
                ? '/'
                : window.location.pathname

              window.history.pushState({}, '', showcasePath)
              setIsDigitalMenu(false)
              setIntroVisible(false)
              setHeroReady(true)
            }}
          />
        </Suspense>
      </MotionConfig>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <IntroContext.Provider value={{ ready: heroReady }}>
        <LayoutGroup id="cafe-in-intro">
          {introVisible && <IntroAnimation onReveal={() => setHeroReady(true)} onDone={() => setIntroVisible(false)} />}

          <a
            href="#menu"
            onClick={(event) => {
              event.preventDefault()
              scrollToId('menu')
            }}
            className="label fixed top-3 left-3 z-[90] -translate-y-24 rounded-full bg-bronze px-5 py-3 text-espresso focus:translate-y-0"
          >
            Skip to menu
          </a>

          <div className="grain">
            <Navbar />
            <main>
              <HeroSection />
              <SignatureSpecials onSelect={setSelected} />
              <MenuSection onSelect={setSelected} />
              <AboutSection />
              <GallerySection />
              <ReviewsSection />
              <VisitUsSection />
            </main>
            <Footer />
          </div>

          <ProductDetailModal item={selected} onClose={() => setSelected(null)} />
        </LayoutGroup>
      </IntroContext.Provider>
    </MotionConfig>
  )
}
