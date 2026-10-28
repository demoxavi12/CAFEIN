import type { EnhancedMenuItem } from './adminStore'

interface Props {
  isOpen: boolean
  onClose: () => void
  tray: Record<string, number>
  items: EnhancedMenuItem[]
  tableNumber: string
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  onClear: () => void
}

export function TableOrderTrayModal({
  isOpen,
  onClose,
  tray,
  items,
  tableNumber,
  onAdd,
  onRemove,
  onClear,
}: Props) {
  if (!isOpen) return null

  const itemsMap = new Map(items.map((i) => [i.id, i]))
  const trayEntries = Object.entries(tray).filter(([, qty]) => qty > 0)

  let totalAmount = 0
  const orderList = trayEntries.map(([id, qty]) => {
    const item = itemsMap.get(id)
    const price = item?.price ?? 0
    totalAmount += price * qty
    return { item, qty, subtotal: price * qty }
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl border border-ivory/15 bg-espresso-2 p-5 sm:p-6 shadow-2xl flex flex-col text-ivory max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ivory/10 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <h3 className="font-display text-lg text-ivory">Table Order Summary</h3>
            </div>
            <p className="text-[11px] font-mono text-bronze">
              Table: {tableNumber} • Show this to your waiter
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-ivory/10 text-ivory/70 hover:bg-ivory/20 transition-colors text-xs"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-3 flex flex-col gap-2.5">
          {orderList.length === 0 ? (
            <div className="py-12 text-center text-ivory/50">
              <p className="text-3xl">☕</p>
              <p className="font-display text-lg text-ivory mt-2">Your table order list is empty</p>
              <p className="mt-1 text-xs">Tap "+ Add" on any menu item to build your list for the waiter.</p>
            </div>
          ) : (
            orderList.map(({ item, qty, subtotal }) => {
              if (!item) return null
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl bg-ivory/5 p-3 border border-ivory/5 text-xs"
                >
                  <div className="flex-1 pr-2">
                    <p className="font-semibold text-ivory text-sm">{item.name}</p>
                    <p className="text-[10px] text-ivory/50 font-mono">
                      ₹{item.price} each • {item.section}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-full bg-black/40 border border-ivory/10 px-2 py-1">
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        className="text-xs font-bold text-ivory/70 hover:text-bronze px-1"
                      >
                        -
                      </button>
                      <span className="font-mono text-xs font-bold text-bronze">{qty}</span>
                      <button
                        type="button"
                        onClick={() => onAdd(item.id)}
                        className="text-xs font-bold text-ivory/70 hover:text-bronze px-1"
                      >
                        +
                      </button>
                    </div>

                    <span className="w-14 text-right font-mono font-bold text-ivory">
                      ₹{subtotal}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer with Total */}
        {orderList.length > 0 && (
          <div className="border-t border-ivory/10 pt-3 flex flex-col gap-3">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-ivory/70">Estimated Bill Total:</span>
              <span className="font-mono text-2xl font-bold text-bronze">
                ₹{totalAmount}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onClear}
                className="text-xs text-red-400 hover:text-red-300 underline"
              >
                Clear List
              </button>

              <button
                type="button"
                onClick={onClose}
                className="btn btn-primary min-h-10 px-6 text-xs uppercase tracking-wider"
              >
                Back to Menu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
