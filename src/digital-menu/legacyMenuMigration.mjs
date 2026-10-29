export const LEGACY_MENU_OVERRIDES_KEY = 'cafein_digital_menu_overrides_v1'
const LEGACY_ADMIN_PIN_KEY = 'cafein_admin_pin_v1'

export function hasLegacyMenuOverrides() {
  try {
    return localStorage.getItem(LEGACY_MENU_OVERRIDES_KEY) !== null
  } catch {
    return false
  }
}

export function clearLegacyAdminPin() {
  try { localStorage.removeItem(LEGACY_ADMIN_PIN_KEY) } catch { /* Browser storage can be unavailable. */ }
}

function readOverrideMap(value, field, validateValue) {
  if (value === undefined) return {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Saved ${field} values are malformed.`)
  const entries = Object.entries(value)
  for (const [id, entry] of entries) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !validateValue(entry)) throw new Error(`Saved ${field} value for ${id} is invalid.`)
  }
  return Object.fromEntries(entries)
}

export function convertLegacyMenuOverrides(raw, snapshot) {
  let parsed
  try { parsed = JSON.parse(raw) } catch { throw new Error('Saved browser menu edits are not valid JSON.') }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Saved browser menu edits have an unsupported format.')
  const object = parsed
  if (Object.keys(object).some((key) => !['prices', 'soldOut', 'badges', 'descriptions'].includes(key))) throw new Error('Saved browser menu edits contain unsupported fields.')
  const prices = readOverrideMap(object.prices, 'price', (value) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100000)
  const soldOut = readOverrideMap(object.soldOut, 'availability', (value) => typeof value === 'boolean')
  const descriptions = readOverrideMap(object.descriptions, 'description', (value) => typeof value === 'string' && value.length <= 500)
  const badges = readOverrideMap(object.badges, 'badge', (value) => typeof value === 'string' && ['', 'Bestseller', 'Chef Special', 'bestseller', 'chef-special', 'chef special'].includes(value))
  const existingIds = new Set(snapshot.items.map((item) => item.id))
  const allIds = [...Object.keys(prices), ...Object.keys(soldOut), ...Object.keys(descriptions), ...Object.keys(badges)]
  const missingId = allIds.find((id) => !existingIds.has(id))
  if (missingId) throw new Error(`Saved browser edits refer to an item no longer in the menu: ${missingId}.`)

  return {
    schemaVersion: 1,
    revision: snapshot.revision,
    categories: snapshot.categories,
    items: snapshot.items.map((item) => {
      const badge = Object.hasOwn(badges, item.id) ? badges[item.id] : item.badge
      return {
        ...item,
        ...(Object.hasOwn(prices, item.id) ? { price: prices[item.id] } : {}),
        ...(Object.hasOwn(soldOut, item.id) ? { isSoldOut: soldOut[item.id] } : {}),
        ...(Object.hasOwn(descriptions, item.id) ? { description: descriptions[item.id] } : {}),
        badge: badge === 'bestseller' ? 'Bestseller' : badge === 'chef-special' || badge === 'chef special' ? 'Chef Special' : badge || undefined,
      }
    }),
  }
}

export function getLegacyMenuBackup(snapshot) {
  let raw
  try { raw = localStorage.getItem(LEGACY_MENU_OVERRIDES_KEY) } catch { throw new Error('Saved browser edits cannot be read in this browser.') }
  return raw ? convertLegacyMenuOverrides(raw, snapshot) : null
}

export function clearLegacyMenuOverrides() {
  try {
    localStorage.removeItem(LEGACY_MENU_OVERRIDES_KEY)
    return !hasLegacyMenuOverrides()
  } catch {
    return false
  }
}
