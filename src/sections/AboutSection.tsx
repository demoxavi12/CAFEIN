import { motion, useReducedMotion } from 'motion/react'
import { Camera } from 'lucide-react'
import { SectionHeading } from '../components/SectionHeading'
import { EASE_OUT } from '../lib/motion'

const ownerMessage = [
  "I've always felt that Nabarangpur was missing a good café — a place where people could enjoy good coffee, explore new food and simply spend time together.",
  'With my love for trying new food and discovering new flavours, I wanted to bring that experience here. A place where people could come in, sit back, enjoy a nice cup of coffee with some good food, and make a few lovely memories along the way.',
  "That's how Cafe In began.",
]

export function AboutSection() {
  const reduceMotion = useReducedMotion()
  const transition = reduceMotion ? { duration: 0 } : { duration: 0.5, ease: EASE_OUT }

  return (
    <section id="story" aria-labelledby="story-title" className="relative overflow-hidden bg-[#211813] py-16 text-[#F7F3EB] sm:py-20 lg:py-24">
      <div className="container-x">
        <SectionHeading
          id="story-title"
          eyebrow="OUR STORY · NABARANGPUR, ODISHA"
          title="The story behind the experience."
          className="max-w-5xl"
        />

        <div className="mt-8 grid gap-8 sm:mt-10 md:grid-cols-12 md:items-start md:gap-8 lg:mt-12 lg:gap-12">
          <motion.figure
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={transition}
            className="md:col-span-5 lg:col-span-4"
          >
            <div
              role="img"
              aria-label="Founder portrait placeholder; portrait to be added"
              className="relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-sm border border-[#b7a47f]/35 bg-[radial-gradient(ellipse_at_50%_35%,rgba(133,133,104,0.16),transparent_56%),linear-gradient(145deg,#30231e,#211813_72%)] p-5"
            >
              <div aria-hidden="true" className="absolute inset-3 border border-[#d8cdbd]/10" />
              <div aria-hidden="true" className="absolute left-6 top-6 h-7 w-7 border-l border-t border-[#b7a47f]/55" />
              <div aria-hidden="true" className="absolute bottom-6 right-6 h-7 w-7 border-b border-r border-[#b7a47f]/55" />
              <div className="relative flex flex-col items-center text-center">
                <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[#b7a47f]/35 text-[#b7a47f]">
                  <Camera aria-hidden="true" size={22} strokeWidth={1.3} />
                </span>
                <span className="label text-[#d8cdbd]">Founder portrait</span>
                <span className="mt-2 text-sm text-[#d8cdbd]/60">Portrait to be added</span>
              </div>
            </div>
          </motion.figure>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ ...transition, delay: reduceMotion ? 0 : 0.08 }}
            className="md:col-span-7 lg:col-span-7 lg:col-start-6"
            aria-label="Owner's message"
          >
            {ownerMessage.map((paragraph, index) => (
              <p
                key={paragraph}
                className={`${index === 0 ? 'display text-2xl leading-snug text-[#F7F3EB] sm:text-3xl' : 'text-base leading-8 text-[#d8cdbd] sm:text-lg sm:leading-9'} ${index > 0 ? 'mt-5 sm:mt-6' : ''}`}
              >
                {paragraph}
              </p>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
