import { useState } from 'react'
import { motion } from 'motion/react'
import {
  Coffee,
  CupSoda,
  UtensilsCrossed,
  Sandwich,
  CakeSlice,
  Flame,
  Sparkles,
  Camera,
  Plus,
  Minus,
  Info,
} from 'lucide-react'
import type { EnhancedMenuItem } from './adminStore'

interface Props {
  item: EnhancedMenuItem
  quantityInTray: number
  onSelect: (item: EnhancedMenuItem) => void
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  compact?: boolean
}

/**
 * Returns an appropriate luxury culinary icon based on category and section
 */
function getCategoryMotif(category: string, section: string, name: string) {
  const lowerName = name.toLowerCase()
  const lowerSec = section.toLowerCase()

  if (category === 'desserts' || lowerSec.includes('sweet') || lowerName.includes('cheesecake') || lowerName.includes('brownie')) {
    return {
      icon: CakeSlice,
      label: 'Sweet Delicacy',
      accent: 'from-amber-500/20 via-rose-500/10 to-transparent',
      ring: 'border-amber-400/30',
      text: 'text-amber-200/90',
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
      text: 'text-cyan-200/90',
    }
  }

  if (category === 'beverages' || lowerSec.includes('espresso') || lowerSec.includes('velvet')) {
    return {
      icon: Coffee,
      label: 'Artisan Roast',
      accent: 'from-amber-600/25 via-yellow-700/10 to-transparent',
      ring: 'border-amber-500/30',
      text: 'text-amber-200/90',
    }
  }

  if (lowerSec.includes('burgers') || lowerSec.includes('submarine') || lowerSec.includes('pressed') || lowerName.includes('sandwich')) {
    return {
      icon: Sandwich,
      label: 'Gourmet Handheld',
      accent: 'from-emerald-500/20 via-amber-500/10 to-transparent',
      ring: 'border-emerald-400/30',
      text: 'text-emerald-200/90',
    }
  }

  if (lowerSec.includes('crisp') || lowerName.includes('fries') || lowerName.includes('nachos') || lowerName.includes('nuggets')) {
    return {
      icon: Flame,
      label: 'Hot & Golden',
      accent: 'from-orange-500/25 via-amber-600/10 to-transparent',
      ring: 'border-orange-400/30',
      text: 'text-orange-200/90',
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

export function MenuDishCard({
  item,
  quantityInTray,
  onSelect,
  onAdd,
  onRemove,
  compact = false,
}: Props) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const motif = getCategoryMotif(item.category, item.section, item.name)
  const MotifIcon = motif.icon

  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      className={`group relative flex flex-col justify-between rounded-2xl border border-ivory/12 bg-gradient-to-b from-mocha/85 via-espresso-2/95 to-espresso p-4 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-bronze/45 hover:shadow-2xl hover:shadow-bronze/5 ${
        compact ? 'w-[280px] shrink-0' : 'w-full'
      } ${item.isSoldOut ? 'opacity-65 grayscale-[25%]' : ''}`}
    >
      {/* Clickable Card Body */}
      <div
        onClick={() => onSelect(item)}
        className="cursor-pointer select-none"
        role="button"
        tabIndex={0}
      >
        {/* Top Badges: Veg dot, Badge (Bestseller), Price */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Green Veg Icon */}
            <span
              className="flex h-4 w-4 items-center justify-center rounded border border-emerald-500/80 p-0.5 bg-emerald-950/40"
              title="100% Vegetarian"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>

            {item.badge && (
              <span className="rounded-full bg-bronze/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bronze border border-bronze/35 shadow-sm">
                ★ {item.badge}
              </span>
            )}

            {item.isSoldOut && (
              <span className="rounded-full bg-red-950/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300 border border-red-500/40">
                Sold Out
              </span>
            )}
          </div>

          <span className="rounded-full bg-espresso-2/90 px-2.5 py-1 font-mono text-sm font-bold text-bronze shadow-inner border border-ivory/10">
            ₹{item.price}
          </span>
        </div>

        {/* Dish Visual Area: Real photo OR Luxury Culinary Skeleton */}
        <div className="relative mt-3.5 h-36 sm:h-40 w-full overflow-hidden rounded-xl border border-ivory/10 shadow-inner bg-black/40">
          {item.image ? (
            <>
              {/* Shimmer skeleton while image loads */}
              {!imgLoaded && (
                <div className="absolute inset-0 bg-gradient-to-r from-espresso via-mocha/40 to-espresso">
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-ivory/10 to-transparent" />
                  <div className="flex h-full items-center justify-center">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-ivory/40">
                      Loading Capture…
                    </span>
                  </div>
                </div>
              )}

              {/* Real in-café photo */}
              <img
                src={item.image.src}
                alt={item.name}
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
                style={{
                  objectPosition: item.image.focus || '50% 50%',
                }}
                className={`h-full w-full object-cover transition-all duration-700 group-hover:scale-105 ${
                  imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
              />

              {/* Cinematic Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-espresso via-transparent to-black/20 pointer-events-none" />

              {/* Photo pill */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-2 py-0.5 text-[9px] font-mono tracking-wider text-ivory/80 border border-ivory/15">
                <Camera className="w-2.5 h-2.5 text-bronze" />
                <span>In-Café Shot</span>
              </div>
            </>
          ) : (
            /* Luxury Culinary "Photo Coming Soon" Skeleton Presentation */
            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#1b1511] via-[#140e0b] to-[#0d0907] px-3 text-center">
              {/* Background ambient radial glow */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${motif.accent} opacity-60 pointer-events-none`}
              />

              {/* Fine Shimmer light sweep */}
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-ivory/[0.07] to-transparent pointer-events-none" />

              {/* Central Stylized Motif Ring */}
              <div className="relative mb-2 flex items-center justify-center">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full border ${motif.ring} bg-espresso-2/80 shadow-md backdrop-blur-sm transition-transform duration-300 group-hover:scale-110`}
                >
                  <MotifIcon className={`h-5 w-5 ${motif.text}`} strokeWidth={1.7} />
                </div>
                {/* Subtle pulse ring */}
                <div
                  className={`absolute -inset-1 rounded-full border border-ivory/5 animate-pulse-subtle pointer-events-none`}
                />
              </div>

              {/* Badge & Subtitle */}
              <div className="relative z-10 flex flex-col items-center gap-0.5">
                <span className="rounded-full bg-ivory/5 px-2.5 py-0.5 text-[9px] font-mono font-medium uppercase tracking-widest text-ivory/70 border border-ivory/10 shadow-sm">
                  Photo Coming Soon
                </span>
                <span className="text-[10px] font-sans text-ivory/40">
                  {motif.label} • Made Fresh
                </span>
              </div>

              {/* Bottom fine border flourish */}
              <div className="absolute bottom-0 inset-x-4 h-[1px] bg-gradient-to-r from-transparent via-bronze/30 to-transparent" />
            </div>
          )}
        </div>

        {/* Dish Title & Section */}
        <div className="mt-3.5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-bronze/90">
            {item.section}
          </p>
          <h4 className="mt-0.5 font-display text-lg text-ivory group-hover:text-bronze transition-colors leading-snug">
            {item.name}
          </h4>
        </div>

        {/* Description */}
        {item.description && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ivory/65">
            {item.description}
          </p>
        )}
      </div>

      {/* Footer Controls: Details trigger + Add/Remove Stepper */}
      <div className="mt-4 flex items-center justify-between border-t border-ivory/10 pt-3">
        <button
          type="button"
          onClick={() => onSelect(item)}
          className="inline-flex items-center gap-1 text-[11px] font-medium tracking-wide text-ivory/60 hover:text-ivory transition-colors group/btn"
        >
          <Info className="w-3 h-3 text-bronze group-hover/btn:text-ivory transition-colors" />
          <span className="underline underline-offset-4">Details</span>
        </button>

        {/* Add to Tray Controls */}
        {item.isSoldOut ? (
          <span className="text-xs italic text-ivory/40">Unavailable</span>
        ) : quantityInTray > 0 ? (
          <div className="flex items-center gap-2 rounded-full bg-bronze/20 border border-bronze/40 p-1 shadow-inner">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(item.id)
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-espresso text-ivory hover:bg-bronze hover:text-espresso transition-colors text-xs font-bold active:scale-90"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-4 text-center font-mono text-xs font-bold text-ivory">
              {quantityInTray}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onAdd(item.id)
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-bronze text-espresso hover:brightness-110 transition-colors text-xs font-bold active:scale-90"
              aria-label="Increase quantity"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onAdd(item.id)
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-bronze/50 bg-bronze/10 px-3 py-1 text-xs font-semibold tracking-wider text-bronze uppercase hover:bg-bronze hover:text-espresso active:scale-95 transition-all shadow-sm"
          >
            <Plus className="w-3 h-3" />
            <span>Add</span>
          </button>
        )}
      </div>
    </motion.div>
  )
}
