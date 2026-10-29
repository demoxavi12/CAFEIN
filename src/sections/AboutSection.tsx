import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Camera } from 'lucide-react'
import { useState } from 'react'
import { SectionHeading } from '../components/SectionHeading'
import { EASE_OUT } from '../lib/motion'

const chapters = [
  {
    title: 'The Idea',
    body: 'Our love for coffee and food inspired us to bring something special to Nabarangpur — a place where people could slow down, discover new flavours, share conversations, and make memories.',
  },
  {
    title: 'The People',
    body: "For us, Cafe In is about more than what's on the table. It's about the care behind every cup, the joy of sharing a meal, and the conversations that bring people together.",
  },
  {
    title: 'The Place',
    body: 'We imagined a welcoming place where good coffee, thoughtful food, and meaningful moments come together — and where the feeling makes you want to come back.',
  },
]

export function AboutSection() {
  const [activeChapter, setActiveChapter] = useState(0)
  const reduceMotion = useReducedMotion()
  const transition = reduceMotion ? { duration: 0 } : { duration: 0.45, ease: EASE_OUT }

  return (
    <section id="story" aria-labelledby="story-title" className="relative overflow-hidden bg-[#211813] py-20 text-[#F7F3EB] sm:py-28 lg:py-36">
      <div className="container-x">
        <SectionHeading
          id="story-title"
          eyebrow="OUR STORY · NABARANGPUR, ODISHA"
          title="A dream brewed"
          italic="with love."
          className="max-w-4xl"
        />

        <div className="mt-12 grid gap-10 sm:mt-16 md:grid-cols-12 md:items-start md:gap-8 lg:mt-20 lg:gap-12">
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={transition}
            className="display max-w-3xl text-2xl leading-snug text-[#F7F3EB] sm:text-3xl md:col-span-10 md:text-4xl lg:col-span-9"
          >
            We imagined more than a café. We imagined a place where good coffee, thoughtful food, and meaningful moments come together.
          </motion.p>

          <motion.figure
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ ...transition, delay: reduceMotion ? 0 : 0.08 }}
            className="md:col-span-5 md:col-start-1 md:row-start-2 lg:col-span-4"
          >
            <div
              role="img"
              aria-label="Founder portrait placeholder"
              className="relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-sm border border-[#b7a47f]/35 bg-[radial-gradient(ellipse_at_50%_35%,rgba(133,133,104,0.16),transparent_56%),linear-gradient(145deg,#30231e,#211813_72%)] p-5"
            >
              <div aria-hidden="true" className="absolute inset-3 border border-[#d8cdbd]/10" />
              <div aria-hidden="true" className="absolute left-6 top-6 h-7 w-7 border-l border-t border-[#b7a47f]/55" />
              <div aria-hidden="true" className="absolute bottom-6 right-6 h-7 w-7 border-b border-r border-[#b7a47f]/55" />
              <div className="relative flex flex-col items-center text-center">
                <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[#b7a47f]/35 text-[#b7a47f]">
                  <Camera aria-hidden="true" size={22} strokeWidth={1.3} />
                </span>
                <span className="label text-[#d8cdbd]">Founder Portrait</span>
                <span className="mt-2 text-sm text-[#d8cdbd]/60">Portrait to be added</span>
              </div>
            </div>
            <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <span className="label text-[#b7a47f]">The founders of Cafe In</span>
              <span className="text-xs text-[#d8cdbd]/50">Provisional attribution</span>
            </figcaption>
          </motion.figure>

          <div className="md:col-span-7 md:col-start-6 md:row-start-2 lg:col-span-7 lg:col-start-6">
            <div className="grid gap-7 border-t border-[#F7F3EB]/15 pt-6 sm:grid-cols-3 sm:gap-4" role="group" aria-label="Our story chapters">
              {chapters.map((chapter, index) => {
                const active = activeChapter === index
                return (
                  <button
                    key={chapter.title}
                    id={`story-chapter-${index}`}
                    type="button"
                    aria-pressed={active}
                    aria-controls="story-chapter-panel"
                    onClick={() => setActiveChapter(index)}
                    className="group min-h-11 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b7a47f]"
                  >
                    <span className={`mb-3 block h-px transition-all duration-300 ${active ? 'w-full bg-[#b7a47f]' : 'w-8 bg-[#F7F3EB]/25 group-hover:w-12 group-hover:bg-[#b7a47f]/70'}`} />
                    <span className={`label tracking-[0.14em] transition-colors ${active ? 'text-[#F7F3EB]' : 'text-[#d8cdbd]/55 group-hover:text-[#d8cdbd]'}`}>
                      0{index + 1} <span className="ml-1">{chapter.title}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-8 min-h-40 sm:mt-10 sm:min-h-36" id="story-chapter-panel" aria-live="polite" aria-atomic="true">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeChapter}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={transition}
                >
                  <h3 className="display text-3xl text-[#F7F3EB] sm:text-4xl">{chapters[activeChapter].title}</h3>
                  <p className="mt-5 max-w-2xl text-base leading-8 text-[#d8cdbd] sm:text-lg sm:leading-9">
                    {chapters[activeChapter].body}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#d8cdbd]/45">Story copy is provisional pending confirmation from the owners.</p>
          </div>
        </div>

        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...transition, duration: reduceMotion ? 0 : 0.7 }}
          className="display mt-16 text-center text-[clamp(2rem,5vw,3.6rem)] italic text-[#F7F3EB] sm:mt-24"
        >
          Brew it. Love it. Live it!
        </motion.p>
      </div>
    </section>
  )
}
