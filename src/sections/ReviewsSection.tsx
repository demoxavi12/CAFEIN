import reviewData from '../data/reviews.json?raw'
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play, Star } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { EASE_OUT } from '../lib/motion'

interface CustomerReview {
  id: string
  name: string
  rating: 4 | 5
  dateLabel?: string
  text: string
  source: string
  truncated?: boolean
}

const reviews = JSON.parse(reviewData) as CustomerReview[]
const GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/b53d1Gxnwcnpeb1QA'
const COLLAPSED_REVIEW_LENGTH = 220
const AUTO_ADVANCE_MS = 7_000

function ReviewCard({
  review,
  index,
  expanded,
  onToggleExpanded,
  reduceMotion,
}: {
  review: CustomerReview
  index: number
  expanded: boolean
  onToggleExpanded: () => void
  reduceMotion: boolean
}) {
  const canExpand = !review.truncated && review.text.length > COLLAPSED_REVIEW_LENGTH
  const displayedText = canExpand && !expanded
    ? `${review.text.slice(0, COLLAPSED_REVIEW_LENGTH).trimEnd()}…`
    : review.text
  const initial = review.name.trim().match(/\p{L}/u)?.[0] ?? review.name.trim().slice(0, 1)

  return (
    <motion.article
      className="min-w-0 self-start rounded-xl border border-bronze/20 bg-[#211813] p-5 shadow-[0_14px_36px_-28px_rgba(0,0,0,0.8)] sm:p-6"
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: reduceMotion ? 0 : 0.42, ease: EASE_OUT, delay: reduceMotion ? 0 : (index % 3) * 0.05 }}
    >
      <figure>
        <figcaption className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-bronze/35 bg-mocha-2 text-sm font-medium uppercase text-bronze"
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-sm font-medium leading-snug text-ivory sm:text-base">{review.name}</h3>
            <div className="mt-1 flex items-center gap-2">
              <span className="flex items-center gap-0.5" aria-hidden="true">
                {Array.from({ length: 5 }, (_, starIndex) => (
                  <Star
                    key={starIndex}
                    size={13}
                    strokeWidth={1.5}
                    className={starIndex < review.rating ? 'fill-[#d4ad61] text-[#d4ad61]' : 'fill-transparent text-[#d4ad61]/35'}
                  />
                ))}
              </span>
              <span className="sr-only">{review.rating} out of 5 stars</span>
            </div>
          </div>
        </figcaption>

        <blockquote className="mt-5 text-sm leading-7 text-ivory/80 sm:text-[0.95rem] sm:leading-7">
          <p className="break-words whitespace-pre-line">{displayedText}</p>
          {canExpand && (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={onToggleExpanded}
              className="mt-2 min-h-11 rounded-sm text-left text-xs font-medium tracking-wide text-bronze underline decoration-bronze/50 underline-offset-4 transition-colors hover:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze"
            >
              {expanded ? 'Read less' : 'Read more'}
            </button>
          )}
        </blockquote>

        <div className="mt-5 flex items-center justify-between border-t border-ivory/10 pt-4">
          <span className="label text-[0.62rem] text-ivory/40">Guest note</span>
          <span className="text-xs font-medium tracking-wide text-bronze/75">{review.source}</span>
        </div>
      </figure>
    </motion.article>
  )
}

export function ReviewsSection() {
  const reduceMotion = useReducedMotion() ?? false
  const desktop = useMediaQuery('(min-width: 1024px)')
  const tablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)')
  const reviewsPerGroup = desktop ? 3 : tablet ? 2 : 1
  const groupCount = Math.ceil(reviews.length / reviewsPerGroup)
  const [activeReviewIndex, setActiveReviewIndex] = useState(0)
  const activeGroup = Math.floor(activeReviewIndex / reviewsPerGroup)
  const groupStart = activeGroup * reviewsPerGroup
  const groupEnd = Math.min(groupStart + reviewsPerGroup, reviews.length)
  const [expandedReviewIds, setExpandedReviewIds] = useState<Set<string>>(() => new Set())
  const [explicitlyPaused, setExplicitlyPaused] = useState(false)
  const [viewportHeight, setViewportHeight] = useState<number>()
  const slidesRef = useRef<Array<HTMLDivElement | null>>([])
  const autoPaused = reduceMotion || explicitlyPaused

  useEffect(() => {
    if (autoPaused || groupCount < 2) return

    const timer = window.setTimeout(() => {
      setActiveReviewIndex((currentIndex) => {
        const currentGroup = Math.floor(currentIndex / reviewsPerGroup)
        return ((currentGroup + 1) % groupCount) * reviewsPerGroup
      })
    }, AUTO_ADVANCE_MS)

    return () => window.clearTimeout(timer)
  }, [activeGroup, autoPaused, groupCount, reviewsPerGroup])

  useLayoutEffect(() => {
    const activeSlide = slidesRef.current[activeGroup]
    if (!activeSlide) return

    const measureHeight = () => {
      const nextHeight = Math.ceil(activeSlide.getBoundingClientRect().height)
      setViewportHeight((currentHeight) => currentHeight === nextHeight ? currentHeight : nextHeight)
    }

    measureHeight()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measureHeight)
      return () => window.removeEventListener('resize', measureHeight)
    }

    const observer = new ResizeObserver(measureHeight)
    observer.observe(activeSlide)
    return () => observer.disconnect()
  }, [activeGroup, expandedReviewIds, reviewsPerGroup])

  const moveGroup = (direction: -1 | 1) => {
    const nextGroup = (activeGroup + direction + groupCount) % groupCount
    setActiveReviewIndex(nextGroup * reviewsPerGroup)
  }

  const selectGroup = (groupIndex: number) => {
    setActiveReviewIndex(groupIndex * reviewsPerGroup)
  }

  const toggleExpanded = (reviewId: string) => {
    setExpandedReviewIds((currentIds) => {
      const nextIds = new Set(currentIds)
      if (nextIds.has(reviewId)) nextIds.delete(reviewId)
      else nextIds.add(reviewId)
      return nextIds
    })
  }

  const toggleAutoplay = () => {
    setExplicitlyPaused((current) => !current)
  }

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="relative overflow-x-clip bg-mocha py-16 sm:py-20 lg:py-24">
      <div className="container-x">
        <div className="grid gap-6 md:grid-cols-12 md:items-end md:gap-8">
          <motion.div
            className="md:col-span-7"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: reduceMotion ? 0 : 0.65, ease: EASE_OUT }}
          >
            <h2 id="reviews-title" className="display max-w-[12ch] text-[clamp(2.5rem,6vw,5rem)] leading-[0.98] text-ivory text-balance">
              Kind words,<br />kept close.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ivory/70 sm:text-lg">
              A collection of notes guests have shared about their visits to Cafe In.
            </p>
          </motion.div>

          <div className="flex flex-wrap items-end justify-between gap-4 md:col-span-5 md:justify-end">
            <p className="text-sm text-ivory/55">{reviews.length} guest reviews</p>
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary min-h-12 gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze"
            >
              Open Cafe In on Google Maps
              <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.7} />
            </a>
          </div>
        </div>

        <div
          role="region"
          aria-label="Customer reviews carousel"
          aria-roledescription="carousel"
          className="mt-9 min-w-0 sm:mt-11"
        >
          <motion.div
            id="review-carousel-viewport"
            className="min-w-0 overflow-x-clip overflow-y-visible touch-pan-y"
            style={viewportHeight ? { height: viewportHeight } : undefined}
            animate={{ height: viewportHeight ?? 'auto' }}
            transition={{ duration: reduceMotion ? 0 : 0.38, ease: EASE_OUT }}
            onPanEnd={(_, info) => {
              if (info.offset.x < -56) moveGroup(1)
              else if (info.offset.x > 56) moveGroup(-1)
            }}
          >
            <motion.div
              className="flex w-full items-start"
              initial={false}
              animate={{ x: `${-activeGroup * 100}%` }}
              transition={{ duration: reduceMotion ? 0 : 0.72, ease: EASE_OUT }}
            >
              {Array.from({ length: groupCount }, (_, groupIndex) => {
                const groupReviews = reviews.slice(groupIndex * reviewsPerGroup, (groupIndex + 1) * reviewsPerGroup)
                const active = groupIndex === activeGroup

                return (
                  <div
                    key={`${reviewsPerGroup}-${groupIndex}`}
                    ref={(element) => { slidesRef.current[groupIndex] = element }}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`Review group ${groupIndex + 1} of ${groupCount}`}
                    aria-hidden={!active}
                    inert={!active}
                    className="grid w-full shrink-0 grid-cols-1 items-start gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6"
                  >
                    {groupReviews.map((review, index) => (
                      <ReviewCard
                        key={review.id}
                        review={review}
                        index={index}
                        expanded={expandedReviewIds.has(review.id)}
                        onToggleExpanded={() => toggleExpanded(review.id)}
                        reduceMotion={reduceMotion}
                      />
                    ))}
                  </div>
                )
              })}
            </motion.div>
          </motion.div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm tabular-nums text-ivory/65">
              Reviews {groupStart + 1}–{groupEnd} of {reviews.length}
              <span className="ml-2 text-ivory/40">· Group {activeGroup + 1} of {groupCount}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Show previous review group"
                onClick={() => moveGroup(-1)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ivory/15 bg-mocha-2 text-ivory transition-colors duration-200 hover:border-bronze/50 hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze"
              >
                <ArrowLeft aria-hidden="true" size={17} strokeWidth={1.6} />
              </button>
              <button
                type="button"
                aria-label={autoPaused ? 'Resume review autoplay' : 'Pause review autoplay'}
                aria-pressed={autoPaused}
                disabled={reduceMotion}
                onClick={toggleAutoplay}
                className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-ivory/15 bg-mocha-2 px-3 text-ivory transition-colors duration-200 hover:border-bronze/50 hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze disabled:cursor-not-allowed disabled:opacity-55"
              >
                {autoPaused ? <Play aria-hidden="true" size={15} /> : <Pause aria-hidden="true" size={15} />}
                <span className="sr-only">{reduceMotion ? 'Autoplay disabled for reduced motion' : autoPaused ? 'Play' : 'Pause'}</span>
              </button>
              <button
                type="button"
                aria-label="Show next review group"
                onClick={() => moveGroup(1)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ivory/15 bg-mocha-2 text-ivory transition-colors duration-200 hover:border-bronze/50 hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze"
              >
                <ArrowRight aria-hidden="true" size={17} strokeWidth={1.6} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-1" role="group" aria-label="Choose review group">
            {Array.from({ length: groupCount }, (_, groupIndex) => (
              <button
                key={groupIndex}
                type="button"
                aria-label={`Show review group ${groupIndex + 1} of ${groupCount}`}
                aria-current={groupIndex === activeGroup ? 'step' : undefined}
                aria-controls="review-carousel-viewport"
                onClick={() => selectGroup(groupIndex)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bronze"
              >
                <span
                  aria-hidden="true"
                  className={`h-1 rounded-full transition-[width,background-color] duration-300 ${groupIndex === activeGroup ? 'w-5 bg-bronze' : 'w-1.5 bg-ivory/25'}`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
