import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import {
  X,
  Plus,
  Minus,
  Sparkles,
  UtensilsCrossed,
  Coffee,
  CupSoda,
  Sandwich,
  CakeSlice,
  Flame,
  Camera,
  CheckCircle2,
  Clock,
  HeartHandshake,
} from 'lucide-react'
import type { EnhancedMenuItem } from './adminStore'

interface Props {
  item: EnhancedMenuItem | null
  quantityInTray: number
  onClose: () => void
  onAdd: (id: string) => void
  onRemove: (id: string) => void
}

function getDetailMotif(category: string, section: string, name: string) {
  const lowerName = name.toLowerCase()
  const lowerSec = section.toLowerCase()

  if (category === 'desserts' || lowerSec.includes('sweet') || lowerName.includes('cheesecake') || lowerName.includes('brownie')) {
    return {
      icon: CakeSlice,
      label: 'Sweet Delicacy',
      accent: 'from-amber-500/20 via-rose-500/10 to-transparent',
      ring: 'border-amber-400/30',
      text: 'text-amber-200',
    }
  }

  if (
    lowerSec.includes('chilled') ||
    lowerSec.includes('frosted') ||
    lowerSec.includes('blender') ||
    lowerName.includes('iced') ||
    lowerName.includes('frappe')
  ) {
    return {
      icon: CupSoda,
      label: 'Chilled Craft',
      accent: 'from-cyan-500/20 via-sky-500/10 to-transparent',
      ring: 'border-cyan-400/30',
      text: 'text-cyan-200',
    }
  }

  if (category === 'beverages' || lowerSec.includes('espresso') || lowerSec.includes('velvet')) {
    return {
      icon: Coffee,
      label: 'Artisan Roast',
      accent: 'from-amber-600/25 via-yellow-700/10 to-transparent',
      ring: 'border-amber-500/30',
      text: 'text-amber-200',
    }
  }

  if (lowerSec.includes('burgers') || lowerSec.includes('submarine') || lowerSec.includes('pressed') || lowerName.includes('sandwich')) {
    return {
      icon: Sandwich,
      label: 'Gourmet Handheld',
      accent: 'from-emerald-500/20 via-amber-500/10 to-transparent',
      ring: 'border-emerald-400/30',
      text: 'text-emerald-200',
    }
  }

  if (lowerSec.includes('crisp') || lowerName.includes('fries') || lowerName.includes('nachos') || lowerName.includes('nuggets')) {
    return {
      icon: Flame,
      label: 'Hot & Golden',
      accent: 'from-orange-500/25 via-amber-600/10 to-transparent',
      ring: 'border-orange-400/30',
      text: 'text-orange-200',
    }
  }

  if (lowerSec.includes('pastas') || lowerSec.includes('bowls') || lowerName.includes('spaghetti') || lowerName.includes('penne') || lowerName.includes('salad')) {
    return {
      icon: UtensilsCrossed,
      label: 'Chef Creation',
      accent: 'from-olive/30 via-bronze/10 to-transparent',
      ring: 'border-bronze/35',
      text: 'text-bronze',
    }
  }

  return {
    icon: Sparkles,
    label: 'Kitchen Fresh',
    accent: 'from-bronze/20 via-ivory/5 to-transparent',
    ring: 'border-ivory/20',
    text: 'text-ivory/80',
  }
}

export function DigitalMenuDetailSheet({
  item,
  quantityInTray,
  onClose,
  onAdd,
  onRemove,
}: Props) {
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null)
  if (!item) return null

  const motif = getDetailMotif(item.category, item.section, item.name)
  const MotifIcon = motif.icon

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Sheet Content */}
        <motion.div
          initial={{ y: '100%', opacity: 0.6 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-3xl sm:rounded-3xl border border-ivory/15 bg-gradient-to-b from-mocha-2/95 via-espresso-2/95 to-espresso/98 p-5 sm:p-6 shadow-2xl text-ivory max-h-[92vh] flex flex-col"
        >
          {/* Drag Handle */}
          <div className="flex justify-center -mt-1 mb-3">
            <span className="h-1.5 w-12 rounded-full bg-ivory/20" />
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-ivory/10 text-ivory hover:bg-ivory/20 active:scale-90 transition-all z-20"
            aria-label="Close details"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="overflow-y-auto no-scrollbar pr-0.5">
            {/* Header info */}
            <div className="flex items-start justify-between gap-3 pt-1">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded border border-emerald-500 p-0.5 bg-emerald-950/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-bronze">
                    {item.section}
                  </span>
                  {item.badge && (
                    <span className="rounded-full bg-bronze/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-bronze border border-bronze/30">
                      ★ {item.badge}
                    </span>
                  )}
                </div>
                <h3 className="mt-1 font-display text-2xl text-ivory leading-tight">
                  {item.name}
                </h3>
              </div>

              <div className="text-right shrink-0">
                <span className="font-mono text-2xl font-bold text-bronze">
                  ₹{item.price}
                </span>
                <p className="text-[10px] text-ivory/40">Includes all taxes</p>
              </div>
            </div>

            {/* Visual Display: Real Photo OR Luxury Culinary Presentation */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-ivory/12 bg-black/40 shadow-xl">
              {item.image && failedImageSrc !== item.image.src ? (
                <div className="relative max-h-60 sm:max-h-64 w-full overflow-hidden">
                  <img
                    src={item.image.src}
                    alt={item.name}
                    width={item.image.width}
                    height={item.image.height}
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailedImageSrc(item.image!.src)}
                    style={{
                      objectPosition: item.image.focus || '50% 50%',
                    }}
                    className="w-full h-56 sm:h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-espresso via-transparent to-black/20 pointer-events-none" />
                  <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-mono tracking-wider text-ivory/90 border border-ivory/15">
                    <Camera className="w-3 h-3 text-bronze" />
                    <span>Original Cafe In Photograph</span>
                  </div>
                </div>
              ) : (
                <div className="relative flex h-52 sm:h-56 w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#1b1511] via-[#140e0b] to-[#0c0907] px-6 text-center">
                  <div className={`absolute inset-0 bg-gradient-to-br ${motif.accent} opacity-60 pointer-events-none`} />
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-ivory/[0.08] to-transparent pointer-events-none" />

                  {/* Motif Badge */}
                  <div className="relative mb-3 flex items-center justify-center">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full border ${motif.ring} bg-espresso-2/90 shadow-lg backdrop-blur-md`}>
                      <MotifIcon className={`h-7 w-7 ${motif.text}`} strokeWidth={1.8} />
                    </div>
                  </div>

                  <span className="rounded-full bg-ivory/10 px-3 py-1 text-[10px] font-mono font-semibold uppercase tracking-widest text-ivory/90 border border-ivory/15 shadow-sm">
                    ✦ Photo Coming Soon
                  </span>
                  <p className="mt-2 text-xs text-ivory/60 max-w-xs leading-relaxed">
                    Prepared freshly to order in our kitchen with premium culinary ingredients.
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mt-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-ivory/50">
                Dish Notes & Flavor
              </h4>
              <p className="mt-1.5 text-sm leading-relaxed text-ivory/85">
                {item.description || 'Prepared fresh at Cafe In with premium hand-selected ingredients.'}
              </p>
            </div>

            {/* In-Café Kitchen Highlights */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-xl border border-ivory/10 bg-ivory/5 p-2.5 text-center">
                <Clock className="w-3.5 h-3.5 mx-auto text-bronze mb-1" />
                <p className="text-[10px] uppercase font-mono tracking-wider text-bronze">
                  Prep Time
                </p>
                <p className="mt-0.5 text-[11px] text-ivory/80">Fresh to Order</p>
              </div>

              <div className="rounded-xl border border-ivory/10 bg-ivory/5 p-2.5 text-center">
                <CheckCircle2 className="w-3.5 h-3.5 mx-auto text-emerald-400 mb-1" />
                <p className="text-[10px] uppercase font-mono tracking-wider text-emerald-400">
                  Dietary
                </p>
                <p className="mt-0.5 text-[11px] text-ivory/80">100% Vegetarian</p>
              </div>

              <div className="rounded-xl border border-ivory/10 bg-ivory/5 p-2.5 text-center">
                <HeartHandshake className="w-3.5 h-3.5 mx-auto text-bronze mb-1" />
                <p className="text-[10px] uppercase font-mono tracking-wider text-bronze">
                  Customization
                </p>
                <p className="mt-0.5 text-[11px] text-ivory/80">Ask Your Server</p>
              </div>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="mt-5 flex items-center justify-between border-t border-ivory/10 pt-4">
            <div>
              <p className="text-[11px] text-ivory/50">Table Order Shortlist</p>
              <p className="text-xs font-semibold text-ivory">
                {quantityInTray > 0 ? `${quantityInTray} item(s) in tray` : 'Not added yet'}
              </p>
            </div>

            {item.isSoldOut ? (
              <span className="rounded-full bg-red-950/70 border border-red-500/40 px-4 py-2 text-xs font-bold text-red-300">
                Currently Sold Out
              </span>
            ) : quantityInTray > 0 ? (
              <div className="flex items-center gap-3 rounded-full bg-bronze/20 border border-bronze/40 p-1.5 shadow-md">
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-espresso text-ivory font-bold hover:bg-bronze hover:text-espresso transition-colors active:scale-90"
                  aria-label="Decrease"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-6 text-center font-mono text-sm font-bold">
                  {quantityInTray}
                </span>
                <button
                  type="button"
                  onClick={() => onAdd(item.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-bronze text-espresso font-bold hover:brightness-110 transition-colors active:scale-90"
                  aria-label="Increase"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onAdd(item.id)}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-bronze to-bronze-light px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-espresso shadow-lg hover:brightness-105 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add to Table Order</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
