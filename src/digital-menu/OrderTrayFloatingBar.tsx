import { motion } from 'motion/react'
import type { EnhancedMenuItem } from './adminStore'

interface Props {
  tray: Record<string, number>
  items: EnhancedMenuItem[]
  onOpenTray: () => void
}

export function OrderTrayFloatingBar({ tray, items, onOpenTray }: Props) {
  const itemsMap = new Map(items.map((i) => [i.id, i]))
  const entries = Object.entries(tray).filter(([, qty]) => qty > 0)
  const totalCount = entries.reduce((a, [, qty]) => a + qty, 0)

  if (totalCount === 0) return null

  let totalAmount = 0
  for (const [id, qty] of entries) {
    const item = itemsMap.get(id)
    if (item) totalAmount += item.price * qty
  }

  return (
    <motion.aside
      aria-label="Table order summary"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:right-6 sm:w-96 z-40"
    >
      <button
        type="button"
        onClick={onOpenTray}
        className="w-full flex items-center justify-between rounded-full border border-bronze/50 bg-gradient-to-r from-mocha via-espresso-2 to-mocha p-2.5 px-4 shadow-[0_12px_36px_-8px_rgba(0,0,0,0.8)] backdrop-blur-xl text-ivory hover:scale-[1.01] active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bronze text-espresso font-mono font-bold text-xs shadow">
            {totalCount}
          </span>
          <div className="text-left">
            <p className="text-xs font-semibold leading-tight">Table Order Shortlist</p>
            <p className="text-[10px] text-bronze font-mono">Tap to review for waiter</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-base font-bold text-bronze">
            ₹{totalAmount}
          </span>
          <span className="rounded-full bg-bronze/20 p-1 text-bronze">
            →
          </span>
        </div>
      </button>
    </motion.aside>
  )
}
