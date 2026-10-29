import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { EASE_OUT } from '../lib/motion'

interface ReviewScreenshotAsset {
  src: string
  width: number
  height: number
}

const reviewScreenshots: ReviewScreenshotAsset[] = [
  { src: '/images/google-reviews/review-01.jpeg', width: 484, height: 206 },
  { src: '/images/google-reviews/review-02.jpeg', width: 479, height: 266 },
  { src: '/images/google-reviews/review-03.jpeg', width: 491, height: 213 },
  { src: '/images/google-reviews/review-04.jpeg', width: 472, height: 313 },
  { src: '/images/google-reviews/review-05.jpeg', width: 476, height: 316 },
  { src: '/images/google-reviews/review-06.jpeg', width: 466, height: 200 },
  { src: '/images/google-reviews/review-07.jpeg', width: 472, height: 304 },
  { src: '/images/google-reviews/review-08.jpeg', width: 494, height: 213 },
  { src: '/images/google-reviews/review-09.jpeg', width: 485, height: 208 },
  { src: '/images/google-reviews/review-10.jpeg', width: 474, height: 236 },
  { src: '/images/google-reviews/review-11.jpeg', width: 480, height: 380 },
  { src: '/images/google-reviews/review-12.jpeg', width: 480, height: 220 },
  { src: '/images/google-reviews/review-13.jpeg', width: 492, height: 216 },
  { src: '/images/google-reviews/review-14.jpeg', width: 482, height: 189 },
  { src: '/images/google-reviews/review-15.jpeg', width: 463, height: 217 },
  { src: '/images/google-reviews/review-16.jpeg', width: 492, height: 179 },
  { src: '/images/google-reviews/review-17.jpeg', width: 479, height: 255 },
  { src: '/images/google-reviews/review-18.jpeg', width: 467, height: 232 },
  { src: '/images/google-reviews/review-19.jpeg', width: 493, height: 201 },
  { src: '/images/google-reviews/review-20.jpeg', width: 494, height: 215 },
  { src: '/images/google-reviews/review-21.jpeg', width: 485, height: 192 },
  { src: '/images/google-reviews/review-22.jpeg', width: 498, height: 191 },
  { src: '/images/google-reviews/review-23.jpeg', width: 491, height: 206 },
  { src: '/images/google-reviews/review-24.jpeg', width: 504, height: 193 },
]

const DESKTOP_REVIEWS_PER_PAGE = 4
const TABLET_REVIEWS_PER_PAGE = 3
const MOBILE_REVIEWS_PER_PAGE = 1
const GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/b53d1Gxnwcnpeb1QA'
const FLOAT_DURATIONS = [8.5, 10, 9.2, 11] as const
const REVIEW_ROTATION_MS = 8_000
const COMPOSITION_EXIT_SECONDS = 0.28
const COMPOSITION_ENTER_SECONDS = 0.68
const CARD_ENTER_SECONDS = 0.4
const CARD_STAGGER_SECONDS = 0.06

function ReviewScreenshot({
  asset,
  index,
  sequenceNumber,
  reduceMotion,
  motionPaused,
}: {
  asset: ReviewScreenshotAsset
  index: number
  sequenceNumber: number
  reduceMotion: boolean
  motionPaused: boolean
}) {
  const [failed, setFailed] = useState(false)
  const floatEnabled = !reduceMotion && !motionPaused
  const layoutClass = [
    'sm:col-span-1 lg:col-span-7 lg:mt-1',
    'sm:col-span-1 lg:col-span-5 lg:mt-10',
    'sm:col-span-1 lg:col-span-5',
    'sm:col-span-1 lg:col-span-7 lg:mt-5',
  ][index]
  const backingClass = [
    'lg:rotate-[0.55deg]',
    'lg:-rotate-[0.7deg]',
    'lg:rotate-[0.65deg]',
    'lg:-rotate-[0.45deg]',
  ][index]

  return (
    <motion.figure
      className={`min-w-0 ${layoutClass}`}
      initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.99 }}
      transition={{
        duration: reduceMotion ? 0.01 : CARD_ENTER_SECONDS,
        ease: EASE_OUT,
        delay: reduceMotion ? 0 : index * CARD_STAGGER_SECONDS,
      }}
    >
      <motion.div
        className="relative isolate"
        animate={floatEnabled ? { y: [0, -3, 0] } : { y: 0 }}
        transition={
          floatEnabled
            ? { duration: FLOAT_DURATIONS[index], ease: 'easeInOut', repeat: Infinity, delay: index * 0.22 }
            : { duration: 0.2, ease: EASE_OUT }
        }
      >
        <div aria-hidden="true" className={`pointer-events-none absolute inset-0 z-0 hidden bg-ivory/80 lg:block ${backingClass}`} />
        <div className="relative z-10 rounded-sm border border-espresso/20 bg-ivory p-2 shadow-[0_8px_22px_-17px_rgba(23,19,15,0.52)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_16px_30px_-18px_rgba(23,19,15,0.6)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-2.5">
          <div
            className="relative w-full bg-white"
            style={{ aspectRatio: `${asset.width} / ${asset.height}` }}
          >
            {failed ? (
              <div
                role="img"
                aria-label={`Google review screenshot ${sequenceNumber} of ${reviewScreenshots.length} could not be loaded`}
                className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-espresso"
              >
                Review screenshot unavailable
              </div>
            ) : (
              <img
                src={asset.src}
                width={asset.width}
                height={asset.height}
                alt={`Google review screenshot ${sequenceNumber} of ${reviewScreenshots.length}`}
                loading="lazy"
                decoding="async"
                className="block h-auto w-full"
                onError={() => setFailed(true)}
              />
            )}
          </div>
        </div>
      </motion.div>
    </motion.figure>
  )
}

export function ReviewsSection() {
  const reduceMotion = useReducedMotion() ?? false
  const mobile = useMediaQuery('(max-width: 639px)')
  const tablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)')
  const reviewsPerPage = mobile ? MOBILE_REVIEWS_PER_PAGE : tablet ? TABLET_REVIEWS_PER_PAGE : DESKTOP_REVIEWS_PER_PAGE
  const pageCount = Math.ceil(reviewScreenshots.length / reviewsPerPage)
  const [activeReviewIndex, setActiveReviewIndex] = useState(0)
  const page = Math.floor(activeReviewIndex / reviewsPerPage)
  const [motionPaused, setMotionPaused] = useState(false)
  const compositionKey = `${reviewsPerPage}-${page}`
  const start = page * reviewsPerPage
  const visibleReviews = reviewScreenshots.slice(start, start + reviewsPerPage)
  const end = start + visibleReviews.length

  const movePage = (direction: -1 | 1) => {
    const nextPage = (page + direction + pageCount) % pageCount
    setActiveReviewIndex(nextPage * reviewsPerPage)
  }

  useEffect(() => {
    if (motionPaused) return

    const interval = window.setInterval(() => {
      setActiveReviewIndex((currentIndex) => {
        const currentPage = Math.floor(currentIndex / reviewsPerPage)
        const nextPage = (currentPage + 1) % pageCount
        return nextPage * reviewsPerPage
      })
    }, REVIEW_ROTATION_MS)

    return () => window.clearInterval(interval)
  }, [motionPaused, pageCount, reviewsPerPage])

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="relative overflow-hidden bg-mocha py-24 sm:py-32 lg:py-40">
      <div className="container-x grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-8">
        <div className="lg:col-span-4">
          <motion.h2
            id="reviews-title"
            className="display max-w-[12ch] text-[clamp(2.5rem,6vw,5rem)] leading-[0.98] text-ivory"
            initial={reduceMotion ? false : { opacity: 0, y: 22 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE_OUT }}
          >
            Kind words,<br />kept close.
          </motion.h2>
          <motion.p
            className="mt-6 max-w-sm text-base leading-relaxed text-ivory/75 sm:text-lg"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: reduceMotion ? 0 : 0.7, ease: EASE_OUT, delay: reduceMotion ? 0 : 0.08 }}
          >
            A collection of the original notes guests have shared about their visits to Cafe In.
          </motion.p>

          <a
            href={GOOGLE_MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary mt-8 min-h-12 gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze"
          >
            Open Cafe In on Google Maps
            <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.7} />
          </a>

          <div className="mt-12 text-sm text-ivory/65">
            {reviewScreenshots.length} screenshots in this collection
          </div>
        </div>

        <div className="min-w-0 lg:col-span-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4 sm:mb-7">
            <p className="text-sm text-ivory/75">The original Google review screenshots</p>
            {!reduceMotion && (
              <button
                type="button"
                aria-pressed={motionPaused}
                onClick={() => setMotionPaused((paused) => !paused)}
                className="inline-flex min-h-11 items-center gap-2 text-sm text-ivory/70 transition-colors duration-200 hover:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze"
              >
                {motionPaused ? <Play aria-hidden="true" size={14} /> : <Pause aria-hidden="true" size={14} />}
                {motionPaused ? 'Resume motion' : 'Pause motion'}
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={compositionKey}
              id="review-screenshot-grid"
              className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-12 lg:gap-x-5 lg:gap-y-7"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{
                opacity: 0,
                transition: { duration: reduceMotion ? 0.01 : COMPOSITION_EXIT_SECONDS, ease: EASE_OUT },
              }}
              transition={{ duration: reduceMotion ? 0.01 : COMPOSITION_ENTER_SECONDS, ease: EASE_OUT }}
            >
              {visibleReviews.map((asset, index) => (
                <ReviewScreenshot
                  key={asset.src}
                  asset={asset}
                  index={index}
                  sequenceNumber={start + index + 1}
                  reduceMotion={reduceMotion}
                  motionPaused={motionPaused}
                />
              ))}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-5 sm:mt-10">
            <p className="text-sm tabular-nums text-ivory/70" aria-live="polite" aria-atomic="true">
              Showing {start + 1}–{end} of {reviewScreenshots.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Show previous Google review screenshots"
                aria-controls="review-screenshot-grid"
                onClick={() => movePage(-1)}
                className="inline-flex h-11 w-11 items-center justify-center bg-mocha-2 text-ivory transition-colors duration-200 hover:bg-bronze-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze"
              >
                <ArrowLeft aria-hidden="true" size={17} strokeWidth={1.6} />
              </button>
              <button
                type="button"
                aria-label="Show next Google review screenshots"
                aria-controls="review-screenshot-grid"
                onClick={() => movePage(1)}
                className="inline-flex h-11 w-11 items-center justify-center bg-mocha-2 text-ivory transition-colors duration-200 hover:bg-bronze-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze"
              >
                <ArrowRight aria-hidden="true" size={17} strokeWidth={1.6} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
