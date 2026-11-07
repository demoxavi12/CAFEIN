import { Minus, Plus } from 'lucide-react'
import type { EnhancedMenuItem } from './adminStore'

interface Props {
  item: EnhancedMenuItem
  quantityInTray: number
  onSelect: (item: EnhancedMenuItem) => void
  onAdd: (id: string) => void
  onRemove: (id: string) => void
}

export function InCafeMenuItemRow({ item, quantityInTray, onSelect, onAdd, onRemove }: Props) {
  return (
    <article className={`digital-menu-row ${item.isSoldOut ? 'is-sold-out' : ''}`}>
      {item.image ? (
        <img
          className="digital-menu-row__image"
          src={item.image.src}
          alt={item.image.alt || item.name}
          width={item.image.width}
          height={item.image.height}
          loading="lazy"
          decoding="async"
          style={{ objectPosition: item.image.focus || '50% 50%' }}
        />
      ) : (
        <div className="digital-menu-row__image digital-menu-row__image--empty" aria-hidden="true">
          <span />
        </div>
      )}

      <div className="digital-menu-row__details">
        <div className="digital-menu-row__title-line">
          <button type="button" className="digital-menu-row__title" onClick={() => onSelect(item)}>
            {item.name}
          </button>
          {item.badge && <span className="digital-menu-row__badge">{item.badge}</span>}
          {item.isSoldOut && <span className="digital-menu-row__availability">Sold out</span>}
        </div>
        {item.description && <p className="digital-menu-row__description">{item.description}</p>}
        {item.needsConfirmation && (
          <p className="digital-menu-row__confirmation">Please confirm: {item.needsConfirmation}</p>
        )}
      </div>

      <div className="digital-menu-row__actions">
        <span className="digital-menu-row__price" aria-label={`Price ₹${item.price}`}>₹{item.price}</span>
        {item.isSoldOut ? (
          <span className="digital-menu-row__unavailable">Unavailable</span>
        ) : quantityInTray > 0 ? (
          <div className="digital-menu-row__stepper" aria-label={`${item.name} quantity`}>
            <button type="button" onClick={() => onRemove(item.id)} aria-label={`Remove one ${item.name}`}>
              <Minus aria-hidden="true" />
            </button>
            <span aria-live="polite">{quantityInTray}</span>
            <button type="button" onClick={() => onAdd(item.id)} aria-label={`Add one ${item.name}`}>
              <Plus aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button type="button" className="digital-menu-row__add" onClick={() => onAdd(item.id)} aria-label={`Add ${item.name} to table order`}>
            <Plus aria-hidden="true" />
            <span>Add</span>
          </button>
        )}
      </div>
    </article>
  )
}
