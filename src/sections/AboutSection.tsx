import { motion, useReducedMotion } from 'motion/react'
import { SectionHeading } from '../components/SectionHeading'
import { EASE_OUT } from '../lib/motion'

const ownerMessage = [
  "We've always felt that Nabarangpur was missing a good café — a place where people could enjoy great coffee, explore new flavours, and simply spend time together.",
  'With our shared love for trying new food and discovering different flavours, we wanted to bring that experience to our hometown. A place where people could walk in, sit back, enjoy a nice cup of coffee with good food, and create a few lovely memories along the way.',
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
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm border border-[#b7a47f]/45 bg-[#30231e] p-1.5 sm:p-2">
              <div aria-hidden="true" className="absolute inset-3 border border-[#d8cdbd]/10" />
              <div aria-hidden="true" className="absolute left-6 top-6 h-7 w-7 border-l border-t border-[#b7a47f]/55" />
              <div aria-hidden="true" className="absolute bottom-6 right-6 h-7 w-7 border-b border-r border-[#b7a47f]/55" />
              <div className="relative grid h-full grid-cols-2 gap-1.5 sm:gap-2">
                <div className="relative min-w-0 overflow-hidden">
                  <img
                    src="/images/founders/founder-1.webp"
                    alt="Cafe In founder outdoors"
                    loading="lazy"
                    decoding="async"
                    style={{ top: '90%', objectPosition: '48% 50%' }}
                    className="absolute left-1/2 h-[250%] w-[250%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover"
                  />
                </div>
                <div className="relative min-w-0 overflow-hidden">
                  <img
                    src="/images/founders/founder-2.webp"
                    alt="Cafe In founder at an event"
                    loading="lazy"
                    decoding="async"
                    style={{ top: '82.5%', objectPosition: '52% 50%' }}
                    className="absolute left-1/2 h-[250%] w-[250%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover"
                  />
                </div>
              </div>
            </div>
            <figcaption className="label mt-3 text-right text-[#d8cdbd]">THE FOUNDERS</figcaption>
          </motion.figure>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ ...transition, delay: reduceMotion ? 0 : 0.08 }}
            className="md:col-span-7 lg:col-span-7 lg:col-start-6"
            aria-label="The founders' message"
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
