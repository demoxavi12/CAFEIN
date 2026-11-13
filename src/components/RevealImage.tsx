import { motion, useInView, useReducedMotion } from 'motion/react'
import { useRef } from 'react'
import type { ImageAsset } from '../data/images'
import { EASE_CINEMA } from '../lib/motion'

interface Props {
  image: ImageAsset
  /** Sizing classes (aspect ratio, width) for the frame */
  className?: string
  /** Classes for the image wrapper (hover effects go here, Motion owns the img transform) */
  imgClassName?: string
  /** Direction the mask opens from */
  from?: 'bottom' | 'left' | 'right'
  delay?: number
  eager?: boolean
  onError?: () => void
}

/**
 * Clip-path mask reveal with a gentle settle-in of the image itself.
 * Visibility is observed on the unclipped outer frame — a fully clipped
 * element does not reliably report intersection. Rendered as spans so it is
 * valid inside buttons.
 */
export function RevealImage({ image, className = '', imgClassName = '', delay = 0, eager, onError }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -12% 0px' })
  const reduceMotion = useReducedMotion()
  return (
    <span ref={ref} className={`relative block overflow-hidden ${className}`}>
      <motion.span
        className="absolute inset-0 block overflow-hidden bg-mocha"
        initial={reduceMotion ? false : { opacity: 0.94, y: 6 }}
        animate={reduceMotion ? undefined : inView ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.65, ease: EASE_CINEMA, delay }}
      >
        <span className={`block h-full w-full ${imgClassName}`}>
          <motion.img
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onError={onError}
            className="frame-img"
            style={{ objectPosition: image.focus ?? 'center' }}
            initial={reduceMotion ? false : { scale: 1.04 }}
            animate={reduceMotion ? undefined : inView ? { scale: 1 } : undefined}
            transition={{ duration: 0.9, ease: EASE_CINEMA, delay }}
          />
        </span>
      </motion.span>
    </span>
  )
}
