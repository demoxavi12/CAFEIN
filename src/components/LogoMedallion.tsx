import { motion, useReducedMotion } from 'motion/react'
import { images } from '../data/images'
import { EASE_CINEMA, EASE_OUT } from '../lib/motion'

interface Props {
  /** Starts the entrance (e.g. when the intro hands over) */
  play: boolean
  delay?: number
  className?: string
  /** Decorative when the brand is already named nearby */
  decorative?: boolean
  layoutId?: string
}

/**
 * The real Cafe In logo inside a translucent glass ring. The logo sits on its
 * own beige ground at its original proportions; a bronze hairline draws around
 * it once as a quiet brand signature.
 */
export function LogoMedallion({ play, delay = 0, className = '', decorative = false, layoutId }: Props) {
  const logo = images.logo
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      className={`relative aspect-square ${className}`}
      layoutId={layoutId}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
      animate={reduceMotion ? undefined : play ? { opacity: 1, scale: 1 } : undefined}
      transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT, delay: reduceMotion ? 0 : delay }}
    >
      <div className="glass absolute inset-0 rounded-full" />
      <div className="absolute inset-[9%] overflow-hidden rounded-full bg-[#f4e8d7] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.7)]">
        <img
          src={logo.src}
          alt={decorative ? '' : logo.alt}
          width={logo.width}
          height={logo.height}
          decoding="async"
          className="absolute top-1/2 left-1/2 h-auto w-[145%] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain"
        />
      </div>
      <svg aria-hidden="true" viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full -rotate-90">
        <motion.circle
          cx="50"
          cy="50"
          r="45.5"
          fill="none"
          stroke="var(--color-olive)"
          strokeWidth="0.6"
          strokeLinecap="round"
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
          animate={reduceMotion ? undefined : play ? { pathLength: 1, opacity: 0.9 } : undefined}
          transition={{ duration: reduceMotion ? 0 : 0.9, ease: EASE_CINEMA, delay: reduceMotion ? 0 : delay + 0.1 }}
        />
      </svg>
    </motion.div>
  )
}
