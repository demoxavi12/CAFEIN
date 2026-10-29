import { AnimatePresence, motion, type PanInfo } from 'motion/react'
import { useState } from 'react'
import type { GalleryItem } from '../data/gallery'
import { EASE_OUT } from '../lib/motion'
import { Modal } from './Modal'

interface Props {
  items: GalleryItem[]
  index: number | null
  onClose: () => void
  onIndex: (i: number) => void
}

const SWIPE_PX = 70

export function Lightbox({ items, index, onClose, onIndex }: Props) {
  const [dir, setDir] = useState(1)
  const open = index !== null
  const item = open ? items[index] : null

  const step = (d: number) => {
    if (index === null) return
    setDir(d)
    onIndex((index + d + items.length) % items.length)
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_PX) step(1)
    else if (info.offset.x > SWIPE_PX) step(-1)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="lightbox-caption"
      backdropClassName="bg-espresso/95"
      className="relative flex h-[100svh] w-full flex-col items-center justify-center px-4 py-20 sm:px-20"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') step(1)
        if (e.key === 'ArrowLeft') step(-1)
      }}
    >
      {item && index !== null && (
        <>
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <AnimatePresence initial={false} custom={dir} mode="popLayout">
              <motion.img
                key={item.image.src}
                src={item.image.src}
                alt={item.image.alt}
                width={item.image.width}
                height={item.image.height}
                custom={dir}
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: d * 60 }),
                  center: { opacity: 1, x: 0 },
                  exit: (d: number) => ({ opacity: 0, x: d * -60 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.55, ease: EASE_OUT }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.25}
                onDragEnd={onDragEnd}
                draggable={false}
                className={"max-h-full max-w-full cursor-grab touch-pan-y rounded-[6px] object-contain shadow-2xl select-none active:cursor-grabbing" /* taste-skill-ignore: the selected photo is elevated within its dialog */}
              />
            </AnimatePresence>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 px-4 pb-6 sm:px-8">
            <p id="lightbox-caption" className="display text-xl text-ivory italic sm:text-2xl">
              {item.caption}
            </p>
            <p className="label shrink-0 text-ivory/60" aria-live="polite">
              {String(index + 1).padStart(2, '0') /* taste-skill-ignore: retain the existing lightbox frame number */} / {String(items.length).padStart(2, '0')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous image"
            className="glass glass-control absolute top-1/2 left-2 -mt-6 text-ivory sm:left-6"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next image"
            className="glass glass-control absolute top-1/2 right-2 -mt-6 text-ivory sm:right-6"
          >
            <span aria-hidden="true">→</span>
          </button>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label="Close gallery"
            className="glass label absolute top-5 right-4 inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-ivory transition-[transform,border-color] duration-300 hover:border-bronze/70 active:scale-95 sm:right-8"
          >
            Close <span aria-hidden="true">×</span>
          </button>
        </>
      )}
    </Modal>
  )
}
