import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { useRef, type MouseEvent, type PointerEvent } from 'react'
import { business } from '../data/business'
import { RevealText } from '../components/RevealText'
import { LogoMedallion } from '../components/LogoMedallion'
import { EmberBackground } from '../components/EmberBackground'
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
  const pointerX = useSpring(useMotionValue(0), { stiffness: 90, damping: 24, mass: 0.35 })
  const pointerY = useSpring(useMotionValue(0), { stiffness: 90, damping: 24, mass: 0.35 })
  const mainScale = useTransform(scrollYProgress, [0, 1], [reduceMotion ? 1 : lowPower ? 1.02 : 1.05, 1])
  const supportingX = useTransform(pointerX, (value) => -value * 0.7)
  const supportingY = useTransform(pointerY, (value) => -value * 0.7)

  const moveImages = (event: PointerEvent<HTMLDivElement>) => {
    if (lowPower || reduceMotion || event.pointerType !== 'mouse') return
    const bounds = event.currentTarget.getBoundingClientRect()
    pointerX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 6)
    pointerY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 6)
  }

  const resetImages = () => {
    pointerX.set(0)
    pointerY.set(0)
  }

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
      <EmberBackground />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(55% 60% at 78% 30%, rgba(117,81,61,0.18) 0%, rgba(23,19,15,0) 70%), radial-gradient(40% 50% at 0% 100%, rgba(133,133,104,0.08) 0%, rgba(23,19,15,0) 70%)',
        }}
      />

      <div className="container-x relative z-10 grid items-center gap-10 sm:gap-14 lg:grid-cols-12 lg:gap-10">
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
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.55, delayChildren: 1.28 } } }}
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
              <a href="#menu" onClick={go('menu')} className="btn btn-primary group min-h-14 px-7 shadow-[0_12px_28px_-14px_rgba(117,81,61,0.75)] hover:-translate-y-0.5 focus-visible:-translate-y-0.5">
                Explore Our Menu <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </a>
              <a href="#visit" onClick={go('visit')} className="btn btn-ghost">
                Find Us
              </a>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* One broad interior view, anchored by a single lantern detail. */}
        <div
          onPointerMove={moveImages}
          onPointerLeave={resetImages}
          className="relative w-full max-w-[600px] lg:col-span-6 lg:h-[660px] lg:max-w-none"
        >
          <motion.figure
            layoutId={ready ? 'photo-dining' : undefined}
            style={{ y: yTall }}
            className="relative aspect-[5/4] w-full overflow-hidden rounded-sm bg-mocha ring-1 ring-ivory/15 lg:absolute lg:top-0 lg:right-0 lg:h-[84%] lg:w-[94%]"
          >
            <motion.div
              className="h-full w-full overflow-hidden rounded-sm"
              initial={reduceMotion ? false : { clipPath: 'inset(0 0 100% 0 round 2px)', opacity: 0.92 }}
              animate={reduceMotion ? undefined : ready
                ? { clipPath: 'inset(0 0 0% 0 round 2px)', opacity: 1 }
                : { clipPath: 'inset(0 0 100% 0 round 2px)', opacity: 0.92 }}
              transition={{ duration: 1.05, ease: EASE_CINEMA, delay: reduceMotion ? 0 : 0.08 }}
            >
              <motion.img
                src="/images/sitiing.jpeg"
                alt="Cafe In's dining room, with its botanical mural, pendant lights, wooden tables and emerald chairs"
                width={4096}
                height={1864}
                fetchPriority="high"
                decoding="async"
                className="frame-img"
                style={{ x: pointerX, y: pointerY, scale: mainScale, objectPosition: '45% 56%' }}
              />
            </motion.div>
          </motion.figure>

          <motion.figure
            layoutId={ready ? 'photo-lantern' : undefined}
            style={{ y: yWide }}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reduceMotion ? undefined : ready ? { opacity: 1 } : { opacity: 0 }}
            whileHover={reduceMotion || lowPower ? undefined : { scale: 1.025 }}
            transition={{ duration: 0.7, ease: EASE_OUT, delay: reduceMotion ? 0 : 0.2 }}
            className="absolute top-[8%] right-[2%] z-10 w-[28%] rounded-sm bg-mocha shadow-[0_24px_48px_-24px_rgba(0,0,0,0.7)] lg:top-auto lg:right-0 lg:bottom-[8%] lg:w-[31%]"
          >
            <motion.div
              className="aspect-[3/4] overflow-hidden rounded-sm ring-4 ring-espresso"
              initial={reduceMotion ? false : { y: 18 }}
              animate={reduceMotion ? undefined : ready ? { y: 0 } : { y: 18 }}
              transition={{ duration: 0.7, ease: EASE_OUT, delay: reduceMotion ? 0 : 0.2 }}
            >
              <motion.img
                src="/images/lantern-2.jpeg"
                alt="Close view of a glowing geometric pendant lantern at Cafe In"
                width={1864}
                height={4096}
                loading="lazy"
                decoding="async"
                className="frame-img"
                style={{ x: supportingX, y: supportingY, objectPosition: '48% 48%' }}
              />
            </motion.div>
            <motion.figcaption
              className="label mt-3 ml-auto w-max whitespace-nowrap text-right text-[0.55rem] tracking-[0.12em] text-ivory-2"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={reduceMotion ? undefined : ready ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.45, duration: 0.4 }}
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
        className="label absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-3 text-ivory-2/70 transition-colors hover:text-ivory lg:flex"
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
