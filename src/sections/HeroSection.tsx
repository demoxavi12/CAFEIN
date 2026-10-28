import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef, type MouseEvent } from 'react'
import { business } from '../data/business'
import { images } from '../data/images'
import { RevealText } from '../components/RevealText'
import { LogoMedallion } from '../components/LogoMedallion'
import { useLowPower } from '../hooks/useMediaQuery'
import { EASE_CINEMA, EASE_OUT } from '../lib/motion'
import { scrollToId } from '../lib/scroll'
import { useIntro } from '../lib/intro'

export function HeroSection() {
  const reduceMotion = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const lowPower = useLowPower()
  const { ready } = useIntro()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const yTall = useTransform(scrollYProgress, [0, 1], [0, lowPower ? 0 : -38])
  const yWide = useTransform(scrollYProgress, [0, 1], [0, lowPower ? 0 : 24])
  const yText = useTransform(scrollYProgress, [0, 1], [0, lowPower ? 0 : 12])

  const go = (id: string) => (e: MouseEvent) => {
    e.preventDefault()
    scrollToId(id)
  }

  const [line1, line2] = business.hero.headline
  const state = 'show'

  return (
    <section
      id="top"
      ref={ref}
      aria-labelledby="hero-title"
      className="relative isolate flex items-center overflow-hidden bg-espresso pt-24 pb-16 text-ivory sm:pt-28 lg:min-h-[100svh] lg:pb-20"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(55% 60% at 78% 30%, rgba(117,81,61,0.18) 0%, rgba(23,19,15,0) 70%), radial-gradient(40% 50% at 0% 100%, rgba(133,133,104,0.08) 0%, rgba(23,19,15,0) 70%)',
        }}
      />

      <div className="container-x grid items-center gap-10 sm:gap-14 lg:grid-cols-12 lg:gap-10">
        <motion.div style={{ y: yText }} className="relative z-10 lg:col-span-6">
          <div className="mb-6 flex items-center gap-4 sm:mb-7">
            {/* Mobile/tablet: the logo leads the composition */}
            <motion.p
              className="label flex items-center gap-3 text-bronze"
              initial={reduceMotion ? false : { opacity: 0, x: -8 }}
              animate={reduceMotion ? undefined : ready ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
              transition={{ duration: 0.45, ease: EASE_OUT, delay: reduceMotion ? 0 : 0.08 }}
            >
              <span aria-hidden="true" className="hidden h-px w-10 bg-current lg:block" />
              {business.hero.eyebrow}
            </motion.p>
          </div>

          <h1 id="hero-title" className="display mt-2 text-[clamp(3.15rem,12vw,6.1rem)] text-ivory lg:text-[clamp(4rem,6.1vw,6.8rem)]">
            <RevealText text={line1} play={ready} delay={0.08} stagger={0.05} className="block" />
            <RevealText
              text={line2}
              play={ready}
              delay={0.16}
              stagger={0.05}
              className="block pl-[0.5em] sm:pl-[0.9em]"
              wordClassName="italic text-ivory-2"
            />
          </h1>

          <motion.div
            initial={reduceMotion ? false : 'hidden'}
            animate={reduceMotion ? undefined : ready ? state : 'hidden'}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.18 } } }}
          >
            <motion.p
              className="mt-6 max-w-[38ch] text-base leading-relaxed text-ivory-2 sm:mt-8 sm:text-lg"
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } } }}
            >
              {business.hero.copy}
            </motion.p>
            <motion.div
              className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4"
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } } }}
            >
              <a href="#menu" onClick={go('menu')} className="btn btn-primary group min-h-14 px-7 shadow-[0_12px_28px_-14px_rgba(117,81,61,0.75)]">
                Explore Our Menu <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </a>
              <a href="#visit" onClick={go('visit')} className="btn btn-ghost">
                Find Us
              </a>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Image composition — a calm two-up on small screens, layered on desktop */}
        <div className="relative grid w-full max-w-[600px] grid-cols-[0.78fr_1fr] items-end gap-3 sm:gap-4 lg:col-span-6 lg:block lg:h-[660px] lg:max-w-none">
          <motion.figure layoutId={ready ? 'photo-lantern' : undefined} style={{ y: yTall }} className="relative aspect-[3/4] overflow-hidden rounded-sm bg-mocha ring-1 ring-ivory/15 lg:absolute lg:top-0 lg:right-0 lg:aspect-auto lg:h-[84%] lg:w-[68%]">
            <motion.div
              className="h-full w-full overflow-hidden rounded-sm"
              initial={reduceMotion ? false : { opacity: 0.94 }}
              animate={!reduceMotion ? { opacity: 1 } : undefined}
              transition={{ duration: 0.65, ease: EASE_OUT, delay: 0.08 }}
            >
              <motion.img
                src={images.lantern.src}
                alt={images.lantern.alt}
                width={images.lantern.width}
                height={images.lantern.height}
                fetchPriority="high"
                className="frame-img"
                style={{ objectPosition: images.lantern.focus }}
                initial={reduceMotion ? false : { scale: 1.04 }}
                animate={!reduceMotion ? { scale: 1 } : undefined}
                transition={{ duration: 0.9, ease: EASE_CINEMA, delay: 0.08 }}
              />
            </motion.div>
          </motion.figure>

          <motion.figure layoutId={ready ? 'photo-mural' : undefined} style={{ y: yText }} className="absolute top-[5%] left-[2%] z-0 block w-[35%] overflow-hidden rounded-sm ring-4 ring-espresso lg:w-[35%]">
            <div className="aspect-[4/3] overflow-hidden">
              <img src={images.muralWall.src} alt={images.muralWall.alt} width={images.muralWall.width} height={images.muralWall.height} decoding="async" loading="lazy" className="frame-img" style={{ objectPosition: images.muralWall.focus }} />
            </div>
          </motion.figure>

          <motion.figure layoutId={ready ? 'photo-dining' : undefined} style={{ y: yWide }} className="relative lg:absolute lg:bottom-0 lg:left-0 lg:w-[66%]">
            <motion.div
              className="aspect-[4/3] w-full overflow-hidden rounded-sm shadow-[0_28px_60px_-30px_rgba(0,0,0,0.58)] ring-4 ring-espresso"
              initial={reduceMotion ? false : { opacity: 0.94 }}
              animate={!reduceMotion ? { opacity: 1 } : undefined}
              transition={{ duration: 0.65, ease: EASE_OUT, delay: 0.18 }}
            >
              <img
                src={images.diningRoom.src}
                alt={images.diningRoom.alt}
                width={images.diningRoom.width}
                height={images.diningRoom.height}
                className="frame-img"
                style={{ objectPosition: images.diningRoom.focus }}
              />
            </motion.div>
            <motion.figcaption
              className="label mt-3 text-ivory-2"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={reduceMotion ? undefined : { opacity: 1 }}
              transition={{ delay: reduceMotion ? 0 : 0.35, duration: 0.4 }}
            >
              Inside Cafe In
            </motion.figcaption>
          </motion.figure>

          {/* Desktop: the real logo as a glass medallion where the two photographs meet */}
          <div className="absolute top-[49%] left-[34%] z-10 w-[clamp(116px,24vw,220px)] -translate-x-1/2 -translate-y-1/2 lg:left-[34%] lg:w-[clamp(180px,14vw,220px)]">
            {ready && <LogoMedallion play delay={0} layoutId="cafe-in-logo" />}
          </div>
        </div>
      </div>

      <motion.a
        href="#specials"
        onClick={go('specials')}
        className="label absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-ivory-2/70 transition-colors hover:text-ivory lg:flex"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={reduceMotion ? undefined : ready ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: reduceMotion ? 0 : 0.45, duration: 0.4 }}
      >
        Scroll
        <motion.span
          aria-hidden="true"
          className="block h-10 w-px origin-top bg-current"
          initial={reduceMotion ? false : { scaleY: 0 }}
          animate={reduceMotion ? undefined : { scaleY: 1 }}
          transition={{ delay: reduceMotion ? 0 : 0.5, duration: 0.45, ease: EASE_CINEMA }}
        />
      </motion.a>
    </section>
  )
}
