import { motion, AnimatePresence } from 'motion/react'
import { X, Volume2, VolumeX, Sparkles, MapPin } from 'lucide-react'
import { useState } from 'react'
import { images } from '../data/images'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function CafeAtmosphereModal({ isOpen, onClose }: Props) {
  const [isMuted, setIsMuted] = useState(true)

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-ivory/20 bg-gradient-to-b from-mocha-2/95 via-espresso-2/95 to-espresso p-5 sm:p-6 shadow-2xl text-ivory max-h-[90vh] flex flex-col"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-ivory/80 hover:bg-black hover:text-ivory transition-colors border border-ivory/15"
            aria-label="Close atmosphere modal"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-bronze">
              Cafe In Atmosphere & Vibe
            </span>
          </div>

          <h3 className="font-display text-2xl text-ivory">
            Coffee • Vibes • Memories
          </h3>
          <p className="mt-1 text-xs text-ivory/60 max-w-md">
            Step inside our cozy aesthetic space in Nabarangpur. Handcrafted brews, warm botanical lighting, and gourmet bites.
          </p>

          {/* Video Player */}
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-ivory/15 bg-black shadow-2xl aspect-video w-full flex items-center justify-center">
            <video
              src="/videos/cafe-ambient.mp4"
              autoPlay
              loop
              playsInline
              muted={isMuted}
              className="h-full w-full object-cover"
            />

            {/* Video Controls Overlay */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMuted((m) => !m)}
                className="flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-3 py-1 text-xs font-mono text-ivory border border-ivory/20 hover:bg-black transition-colors"
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-ivory/70" />
                    <span>Unmute</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-bronze" />
                    <span>Muted</span>
                  </>
                )}
              </button>
            </div>

            <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-mono tracking-wider text-ivory/90 border border-ivory/15">
              <Sparkles className="w-3 h-3 text-bronze" />
              <span>In-Café Reel</span>
            </div>
          </div>

          {/* Gallery snapshots below */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="relative h-24 overflow-hidden rounded-xl border border-ivory/10 shadow-inner group">
              <img
                src={images.exteriorNight.src}
                alt="Cafe In Night Facade"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                <span className="text-[10px] font-mono text-ivory/90">Night Ambiance</span>
              </div>
            </div>

            <div className="relative h-24 overflow-hidden rounded-xl border border-ivory/10 shadow-inner group">
              <img
                src={images.diningAtmosphere.src}
                alt="Cafe In Dining Space"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                <span className="text-[10px] font-mono text-ivory/90">Cozy Dining Room</span>
              </div>
            </div>
          </div>

          {/* Location note */}
          <div className="mt-4 flex items-center justify-between border-t border-ivory/10 pt-3 text-xs text-ivory/50">
            <span className="flex items-center gap-1.5 text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-bronze shrink-0" />
              <span>Main Road, Nabarangpur, Odisha</span>
            </span>
            <span className="font-mono text-[11px] text-bronze">Brew it. Love it. Live it!</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
