import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LogoMedallion } from './LogoMedallion'
import { images } from '../data/images'
import { business } from '../data/business'
import { EASE_CINEMA } from '../lib/motion'
import { lockScroll, unlockScroll } from '../lib/scroll'

interface Props {
  onReveal: () => void
  onDone: () => void
}

interface PhotoTile {
  front: string
  back: string
  layoutId?: string
}

// The public/photos folder is absent in this checkout. These paths point to the
// available genuine photo assets already in public/images.
const PHOTO_SET = [
  images.lantern.src,
  images.burger.src,
  images.greekSalad.src,
  images.diningRoom.src,
  images.mushroomSpaghetti.src,
  images.pistachioLatte.src,
  images.muralWall.src,
  images.icedAmericano.src,
  '/images/IMG-20260804-WA0026(1).jpg.jpeg',
  images.buddha.src,
  images.alfredoPenne.src,
  images.biscoffCheesecake.src,
  '/images/Screenshot_20260830_180733.jpg.jpeg',
  '/images/Screenshot_20260830_180741.jpg.jpeg',
  '/images/Screenshot_20260830_180745.jpg.jpeg',
  images.arrabbiataPenne.src,
  images.coldbrewSpecialty.src,
  images.icedLatte.src,
]

const TILES: PhotoTile[] = Array.from({ length: 9 }, (_, index) => ({
  front: PHOTO_SET[index],
  back: PHOTO_SET[index + 9],
  layoutId: index === 0 ? 'photo-lantern' : index === 3 ? 'photo-dining' : index === 6 ? 'photo-mural' : undefined,
}))

const ENTRY = [
  [-80, -45], [0, -100], [90, -48], [-100, 0], [0, 100], [100, 4], [-82, 55], [-8, 100], [85, 52],
]
const TILT = [-2.4, 1.8, -1.3, 1.2, -0.7, 2.1, -1.8, 1.4, -2.2]
const FLIP_INTERVALS = [820, 660, 530, 420, 330, 250, 180, 125]
const FINISH_MS = 9200

export function IntroAnimation({ onReveal, onDone }: Props) {
  const reduce = useReducedMotion()
  const [visible, setVisible] = useState(true)
  const [tileCount, setTileCount] = useState(3)
  const [flip, setFlip] = useState(0)
  const [reveal, setReveal] = useState(false)
  const [logoVisible, setLogoVisible] = useState(false)
  const [flash, setFlash] = useState(false)
  const [failed, setFailed] = useState<Set<string>>(() => new Set())
  const finished = useRef(false)
  const skipRef = useRef<HTMLButtonElement>(null)

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    onReveal()
    setVisible(false)
  }, [onReveal])

  useEffect(() => {
    lockScroll()
    return unlockScroll
  }, [])

  useEffect(() => {
    skipRef.current?.focus({ preventScroll: true })
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKey)

    if (reduce) {
      const timer = window.setTimeout(finish, 350)
      return () => {
        window.clearTimeout(timer)
        window.removeEventListener('keydown', onKey)
      }
    }

    const timers: number[] = [
      window.setTimeout(() => setTileCount(6), 480),
      window.setTimeout(() => setTileCount(9), 1120),
    ]
    let round = 0
    const flipNext = () => {
      const timer = window.setTimeout(() => {
        round += 1
        setFlip(round)
        if (round < FLIP_INTERVALS.length) {
          flipNext()
        } else {
          timers.push(window.setTimeout(() => {
            setReveal(true)
            setFlash(true)
            setLogoVisible(true)
          }, 160))
          timers.push(window.setTimeout(() => setFlash(false), 310))
        }
      }, FLIP_INTERVALS[round])
      timers.push(timer)
    }
    timers.push(window.setTimeout(flipNext, 1700))
    timers.push(window.setTimeout(finish, FINISH_MS))

    return () => {
      timers.forEach(window.clearTimeout)
      window.removeEventListener('keydown', onKey)
    }
  }, [finish, reduce])

  const showLogo = reduce || logoVisible

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          className="cafe-intro fixed inset-0 z-[80] isolate overflow-hidden bg-espresso text-ivory"
          initial={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.01 }}
          transition={{ duration: reduce ? 0.12 : 1.2, ease: EASE_CINEMA }}
          role="region"
          aria-label="Cafe In cinematic introduction"
        >
          <div className="cafe-intro-vignette pointer-events-none absolute inset-0" />

          {!reduce && (
            <div className="cafe-photo-wall absolute inset-0" aria-hidden="true">
              {TILES.slice(0, tileCount).map((tile, index) => {
                const axis = index % 3 === 1 ? 'rotateX' : 'rotateY'
                const faceAngle = flip % 2 ? 180 : 0
                const isHeroTile = Boolean(tile.layoutId)
                const [fromX, fromY] = ENTRY[index]
                return (
                  <motion.figure
                    key={tile.front}
                    layoutId={tile.layoutId}
                    className="cafe-photo-tile"
                    style={{ zIndex: index + 1 }}
                    initial={{ opacity: 0, x: fromX, y: fromY, scale: 0.72, rotate: TILT[index] * 2 }}
                    animate={reveal
                      ? { opacity: isHeroTile ? 1 : 0, x: 0, y: 0, scale: isHeroTile ? 1 : 0.72, rotate: isHeroTile ? 0 : TILT[index] * 2 }
                      : {
                          opacity: 1,
                          x: 0,
                          y: 0,
                          scale: [1.02 + (index % 3) * 0.02, 1.06 + (index % 3) * 0.02, 1.03 + (index % 3) * 0.02],
                          rotate: [TILT[index], TILT[index] + (index % 2 ? 0.65 : -0.65), TILT[index]],
                        }}
                    transition={reveal
                      ? { duration: 0.75, delay: index * 0.025, ease: EASE_CINEMA }
                      : { duration: 0.72, delay: index * 0.065, ease: EASE_CINEMA, repeat: Infinity, repeatType: 'mirror' }}
                  >
                    <motion.div
                      className="cafe-photo-tile-flipper"
                      animate={{ [axis]: faceAngle }}
                      transition={{ duration: FLIP_INTERVALS[Math.min(flip, FLIP_INTERVALS.length - 1)] / 1000, delay: index * 0.018, ease: EASE_CINEMA }}
                    >
                      <div className="cafe-photo-tile-face">
                        {!failed.has(tile.front) && (
                          <img
                            src={tile.front}
                            alt=""
                            decoding="async"
                            loading="eager"
                            fetchPriority={index === 0 ? 'high' : 'low'}
                            onError={() => setFailed((current) => new Set(current).add(tile.front))}
                          />
                        )}
                      </div>
                      <div className="cafe-photo-tile-face cafe-photo-tile-back" style={{ transform: axis === 'rotateX' ? 'rotateX(180deg)' : 'rotateY(180deg)' }}>
                        {!failed.has(tile.back) && (
                          <img
                            src={tile.back}
                            alt=""
                            decoding="async"
                            loading="eager"
                            fetchPriority="low"
                            onError={() => setFailed((current) => new Set(current).add(tile.back))}
                          />
                        )}
                      </div>
                    </motion.div>
                  </motion.figure>
                )
              })}
            </div>
          )}

          {showLogo && (
            <motion.div
              className="absolute top-1/2 left-1/2 z-40 w-[clamp(210px,54vw,360px)] -translate-x-1/2 -translate-y-1/2"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.64, filter: 'blur(14px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: reduce ? 0.2 : 0.72, ease: EASE_CINEMA }}
            >
              <LogoMedallion play layoutId="cafe-in-logo" />
              <p className="label mt-5 text-center text-ivory-2">{business.tagline}</p>
            </motion.div>
          )}

          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-50 bg-[#fff4df]"
            initial={{ opacity: 0 }}
            animate={{ opacity: flash ? 0.9 : 0 }}
            transition={{ duration: flash ? 0.075 : 0.18, ease: 'linear' }}
          />

          <button
            ref={skipRef}
            type="button"
            onClick={finish}
            className="label absolute right-5 bottom-6 z-[60] inline-flex min-h-11 items-center rounded-full border border-ivory/35 bg-espresso/55 px-5 text-ivory transition-colors hover:border-ivory sm:top-6 sm:bottom-auto"
          >
            Skip Intro <span aria-hidden="true" className="ml-2">→</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
