import { motion, useReducedMotion } from 'motion/react'
import { ArrowUpRight, Camera, MapPin } from 'lucide-react'
import type { ReactNode } from 'react'
import { business } from '../data/business'
import { images } from '../data/images'
import { SectionHeading } from '../components/SectionHeading'
import { EASE_OUT } from '../lib/motion'

function Detail({ label, children, pending }: { label: string; children: ReactNode; pending?: boolean }) {
  return (
    <div className="border-t border-ivory/15 py-6">
      <dt className="label text-bronze-light">{label}</dt>
      <dd className={`mt-3 leading-relaxed ${pending ? 'text-ivory/70 italic' : 'text-ivory'}`}>{children}</dd>
    </div>
  )
}

const PENDING = 'Awaiting verified details from Cafe In'
const DIRECTIONS_URL = 'https://maps.app.goo.gl/b53d1Gxnwcnpeb1QA'
const INSTAGRAM_URL = 'https://www.instagram.com/cafein.cafein'
const ADDITIONAL_PHONE = '+91 99379 63773'

export function VisitUsSection() {
  const { address, mapEmbedUrl, phone, hours } = business
  const reduceMotion = useReducedMotion()

  return (
    <section id="visit" aria-labelledby="visit-title" className="relative overflow-hidden bg-espresso-2 py-24 sm:py-32 lg:py-40">
      <div className="container-x grid gap-14 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <SectionHeading id="visit-title" eyebrow="Visit Us" title="Pull up" italic="a chair." />
          <motion.dl
            className="mt-12"
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: reduceMotion ? 0 : 1, ease: EASE_OUT }}
          >
            <Detail label="Address" pending={!address}>
              {address ?? PENDING}
            </Detail>
            <Detail label="Opening hours" pending={!hours}>
              {hours ? (
                <ul className="space-y-1">
                  {hours.map((h) => (
                    <li key={h.days} className="flex justify-between gap-6">
                      <span>{h.days}</span>
                      <span className="text-ivory/70">{h.hours}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                PENDING
              )}
            </Detail>
            <Detail label="Phone">
              <span className="flex flex-col items-start gap-2">
                {phone && (
                  <a className="link-underline inline-flex min-h-11 items-center" href={`tel:${phone.replace(/\s/g, '')}`}>
                    {phone}
                  </a>
                )}
                <a className="link-underline inline-flex min-h-11 items-center" href={`tel:${ADDITIONAL_PHONE.replace(/\s/g, '')}`}>
                  {ADDITIONAL_PHONE}
                </a>
              </span>
            </Detail>
            <Detail label="Email" pending>
              Email address coming soon
            </Detail>
          </motion.dl>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary min-h-12">
              Get directions <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.7} />
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Cafe In on Instagram (opens in a new tab)"
              className="btn btn-ghost min-h-12 gap-2"
            >
              <Camera aria-hidden="true" size={16} strokeWidth={1.7} />
              Instagram
            </a>
          </div>
        </div>

        <motion.div
          className="relative min-h-[380px] overflow-hidden lg:col-span-6 lg:col-start-7 lg:min-h-[560px]"
          initial={reduceMotion ? false : { opacity: 0.96 }}
          whileInView={reduceMotion ? undefined : { opacity: 1 }}
          viewport={{ once: true, margin: '0px 0px -10% 0px' }}
          transition={{ duration: reduceMotion ? 0 : 0.55, ease: [0.76, 0, 0.24, 1] }}
        >
          {mapEmbedUrl ? (
            <iframe
              title="Map showing Cafe In"
              src={mapEmbedUrl}
              className="absolute inset-0 h-full w-full border-0 grayscale-[0.4] sepia-[0.2]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <>
              <img
                src={images.diningRoom.src}
                alt=""
                loading="lazy"
                className="frame-img absolute inset-0 scale-105 opacity-40 blur-[2px]"
                style={{ objectPosition: images.diningRoom.focus }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-espresso-2 via-espresso-2/70 to-espresso-2/30" />
              <svg aria-hidden="true" className="absolute inset-0 h-full w-full text-ivory opacity-[0.12]">
                <defs>
                  <pattern id="map-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                    <path d="M48 0H0V48" fill="none" stroke="currentColor" strokeWidth="0.6" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#map-grid)" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                <span className="relative flex h-14 w-14 items-center justify-center text-bronze-light">
                  <span className="absolute inset-0 rounded-full border border-bronze/60" />
                  <MapPin aria-hidden="true" size={22} strokeWidth={1.5} />
                </span>
                <p className="label mt-6 text-bronze-light">Cafe In · Nabarangpur</p>
                <p className="display mt-3 text-3xl text-ivory italic">Near ICICI Bank</p>

                <a
                  href={DIRECTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline mt-5 inline-flex min-h-11 items-center text-sm text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze"
                >
                  Open the location in Google Maps <ArrowUpRight aria-hidden="true" className="ml-1" size={15} />
                </a>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  )
}
