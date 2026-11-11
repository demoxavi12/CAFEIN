import type { MouseEvent } from 'react'
import { business } from '../data/business'
import { navLinks } from '../data/nav'
import { scrollToId } from '../lib/scroll'
import { Wordmark } from './Wordmark'
import { CafeInLogo } from './CafeInLogo'

export function Footer() {
  const go = (id: string) => (e: MouseEvent) => {
    e.preventDefault()
    scrollToId(id)
  }
  const hasContact = Boolean(business.address || business.phone || business.email)

  return (
    <footer className="relative bg-espresso pt-14 pb-8 sm:pt-16 sm:pb-10">
      <div className="container-x">
        <div className="grid gap-10 border-b border-ivory/10 pb-10 sm:gap-12 sm:pb-12 lg:grid-cols-12">
          <div className="flex items-center gap-6 lg:col-span-5">
            {/* Original Cafe In logo, shown as a round medallion */}
            <span className="relative block h-24 w-24 shrink-0 overflow-hidden rounded-full bg-[#f4e8d7] ring-1 ring-bronze/40 sm:h-28 sm:w-28">
              <CafeInLogo className="scale-[.86]" />
            </span>
            <div>
              <Wordmark className="text-2xl text-ivory" />
              <p className="label mt-3 text-bronze-light">{business.tagline}</p>
              <p className="display mt-2 text-xl text-ivory/75 italic">{business.motto}</p>
            </div>
          </div>

          <nav aria-label="Footer" className="lg:col-span-3 lg:col-start-7">
            <p className="label text-ivory/65">Explore</p>
            <ul className="mt-5 space-y-3">
              {navLinks.map((l) => (
                <li key={l.id}>
                  <a href={`#${l.id}`} onClick={go(l.id)} className="link-underline text-ivory/80 hover:text-ivory">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-3">
            <p className="label text-ivory/65">Find us</p>
            {hasContact ? (
              <address className="mt-5 space-y-2 text-ivory/80 not-italic">
                {business.address && <p>{business.address}</p>}
                {business.phone && <a className="link-underline block min-h-11 w-fit py-2" href={`tel:${business.phone.replace(/\s/g, '')}`}>{business.phone}</a>}
                {business.additionalPhones.map((phone) => <a key={phone} className="link-underline block min-h-11 w-fit py-2" href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a>)}
                {business.email && <p>{business.email}</p>}
              </address>
            ) : (
              <p className="mt-5 text-sm text-ivory/70 italic">Address and contact details coming soon.</p>
            )}
            {business.socials.length > 0 && (
              <ul className="mt-5 flex gap-5">
                {business.socials.map((s) => (
                  <li key={s.href}>
                    <a href={s.href} target="_blank" rel="noreferrer" className="link-underline text-ivory/80">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-8 text-xs text-ivory/65 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {business.name}. Website with digital menu.
          </p>
          <a href="#top" onClick={go('top')} className="label link-underline w-fit text-ivory/60 hover:text-ivory">
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  )
}
