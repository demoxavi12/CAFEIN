import { MotionConfig } from 'motion/react'
import { useEffect, useState } from 'react'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { ProductDetailModal } from './components/ProductDetailModal'
import { HeroSection } from './sections/HeroSection'
import { SignatureSpecials } from './sections/SignatureSpecials'
import { MenuSection } from './sections/MenuSection'
import { AboutSection } from './sections/AboutSection'
import { GallerySection } from './sections/GallerySection'
import { ReviewsSection } from './sections/ReviewsSection'
import { VisitUsSection } from './sections/VisitUsSection'
import { initSmoothScroll, scrollToId } from './lib/scroll'
import type { MenuItem } from './data/menu'
import { DigitalMenuView } from './digital-menu/DigitalMenuView'

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
  const [isDigitalMenu, setIsDigitalMenu] = useState<boolean>(checkIsDigitalMenu)

  // Listen to popstate or hash changes for instant in-cafe routing
  useEffect(() => {
    const handleLocationChange = () => {
      setIsDigitalMenu(checkIsDigitalMenu())
    }
    window.addEventListener('popstate', handleLocationChange)
    window.addEventListener('hashchange', handleLocationChange)
    return () => {
      window.removeEventListener('popstate', handleLocationChange)
      window.removeEventListener('hashchange', handleLocationChange)
    }
  }, [])

  useEffect(() => {
    if (!isDigitalMenu) {
      initSmoothScroll()
    }
  }, [isDigitalMenu])

  // Honour deep links such as /#menu once content has rendered on main site
  useEffect(() => {
    if (isDigitalMenu) return
    const id = window.location.hash.slice(1)
    if (!id || id === 'digital-menu' || id === '/menu') return
    // Jump once web fonts have settled the layout, so the section lands exactly
    let cancelled = false
    const fonts = document.fonts?.ready ?? Promise.resolve()
    fonts.then(() => requestAnimationFrame(() => !cancelled && scrollToId(id, { immediate: true })))
    return () => {
      cancelled = true
    }
  }, [isDigitalMenu])

  // Dedicated In-Café Digital Menu — Direct scan landing
  if (isDigitalMenu) {
    return (
      <MotionConfig reducedMotion="user">
        <DigitalMenuView
          onExitMenu={() => {
            const cleanUrl = window.location.pathname.replace(/\/menu\/?/, '/') || '/'
            window.history.pushState({}, '', cleanUrl)
            setIsDigitalMenu(false)
          }}
        />
      </MotionConfig>
    )
  }

  // Standard Showcase Website (100% Unchanged)
  return (
    <MotionConfig reducedMotion="user">
      <a
        href="#menu"
        onClick={(e) => {
          e.preventDefault()
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
    </MotionConfig>
  )
}

