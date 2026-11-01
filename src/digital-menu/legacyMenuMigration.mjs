export const LEGACY_MENU_OVERRIDES_KEY = 'cafein_digital_menu_overrides_v1'
const LEGACY_ADMIN_PIN_KEY = 'cafein_admin_pin_v1'

const fieldConfig = {
  prices: { label: 'Price', valid: (value) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100000, current: (item) => item.price },
  soldOut: { label: 'Availability', valid: (value) => typeof value === 'boolean', current: (item) => item.isSoldOut },
  badges: { label: 'Badge', valid: (value) => typeof value === 'string' && ['', 'Bestseller', 'Chef Special', 'bestseller', 'chef-special', 'chef special'].includes(value), current: (item) => item.badge || '' },
  descriptions: { label: 'Description', valid: (value) => typeof value === 'string' && value.length <= 500, current: (item) => item.description || '' },
}
const stableId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function hasLegacyMenuOverrides() {
  try { return localStorage.getItem(LEGACY_MENU_OVERRIDES_KEY) !== null } catch { return false }
}

export function clearLegacyAdminPin() {
  try { localStorage.removeItem(LEGACY_ADMIN_PIN_KEY) } catch { /* Browser storage can be unavailable. */ }
}

function recoveryRecord(field, id, value, status, reason, item) {
  const readableId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) ? id.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()) : id
  return {
    key: `${field}:${id}`,
    field,
    label: fieldConfig[field]?.label || field,
    id,
    name: item?.name || readableId,
    value,
    currentValue: item && fieldConfig[field] ? fieldConfig[field].current(item) : undefined,
    status,
    reason,
  }
}

export function inspectLegacyMenuOverrides(raw, snapshot) {
  const records = []
  const malformed = []
  const items = Array.isArray(snapshot?.items) ? snapshot.items : []
  let parsed
  try { parsed = JSON.parse(raw) } catch {
    malformed.push({ key: 'malformed:json', field: 'Saved browser edits', id: '', reason: 'The saved data is not valid JSON.' })
    return { revision: snapshot?.revision ?? 0, records, malformed, total: 1 }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    malformed.push({ key: 'malformed:root', field: 'Saved browser edits', id: '', reason: 'The saved data has an unsupported format.' })
    return { revision: snapshot?.revision ?? 0, records, malformed, total: 1 }
  }

  for (const key of Object.keys(parsed)) {
    if (!Object.hasOwn(fieldConfig, key)) malformed.push({ key: `malformed:${key}`, field: key, id: '', reason: 'This saved field is not supported by the current menu.' })
  }
  const byId = new Map(items.map((item) => [item.id, item]))
  for (const [field, config] of Object.entries(fieldConfig)) {
    const values = parsed[field]
    if (values === undefined) continue
    if (!values || typeof values !== 'object' || Array.isArray(values)) {
      malformed.push({ key: `malformed:${field}`, field: config.label, id: '', reason: 'The saved field list is malformed.' })
      continue
    }
    for (const [id, value] of Object.entries(values)) {
      const item = byId.get(id)
      // Check identity before validating values so obsolete records cannot block review.
      if (!stableId.test(id)) records.push(recoveryRecord(field, id, value, 'invalid', 'The saved item ID is malformed.', item))
      else if (!item) records.push(recoveryRecord(field, id, value, 'obsolete', 'This item no longer exists in the current menu.', item))
      else if (item.isArchived) records.push(recoveryRecord(field, id, value, 'archived', 'This item is archived. Applying a browser edit cannot restore it.', item))
      else if (!config.valid(value)) records.push(recoveryRecord(field, id, value, 'invalid', `Saved ${config.label.toLowerCase()} value for ${id} is invalid.`, item))
      else records.push(recoveryRecord(field, id, value, 'valid', '', item))
    }
  }
  return { revision: snapshot?.revision ?? 0, records, malformed, total: records.length + malformed.length }
}

export function getLegacyMenuRecovery(snapshot) {
  let raw
  try { raw = localStorage.getItem(LEGACY_MENU_OVERRIDES_KEY) } catch { throw new Error('Saved browser edits cannot be read in this browser.') }
  return raw === null ? null : inspectLegacyMenuOverrides(raw, snapshot)
}

export function buildLegacyRecoveryBackup(snapshot, recovery, selectedKeys) {
  const selected = new Set(selectedKeys)
  const applicable = recovery.records.filter((record) => record.status === 'valid' && selected.has(record.key))
  if (!applicable.length) throw new Error('Select at least one valid browser edit to apply.')
  const byItem = new Map()
  for (const record of applicable) {
    const values = byItem.get(record.id) || {}
    values[record.field] = record.value
    byItem.set(record.id, values)
  }
  return {
    schemaVersion: 1,
    revision: snapshot.revision,
    categories: snapshot.categories,
    items: snapshot.items.map((item) => {
      const values = byItem.get(item.id)
      if (!values || item.isArchived) return item
      const badgeValue = Object.hasOwn(values, 'badges') ? values.badges : item.badge
      const badge = badgeValue === 'bestseller' ? 'Bestseller' : badgeValue === 'chef-special' || badgeValue === 'chef special' ? 'Chef Special' : badgeValue || undefined
      return {
        ...item,
        ...(Object.hasOwn(values, 'prices') ? { price: values.prices } : {}),
        ...(Object.hasOwn(values, 'soldOut') ? { isSoldOut: values.soldOut } : {}),
        ...(Object.hasOwn(values, 'descriptions') ? { description: values.descriptions } : {}),
        badge,
      }
    }),
  }
}

export function buildLegacyRecoveryItems(snapshot, recovery, selectedKeys) {
  const backup = buildLegacyRecoveryBackup(snapshot, recovery, selectedKeys)
  const selectedIds = new Set(recovery.records.filter((record) => record.status === 'valid' && selectedKeys.includes(record.key)).map((record) => record.id))
  const currentById = new Map(snapshot.items.map((item) => [item.id, item]))
  return backup.items.filter((item) => selectedIds.has(item.id) && !item.isArchived && JSON.stringify(item) !== JSON.stringify(currentById.get(item.id)))
}

export function removeLegacyOverrideRecords(records, { onlyIfUnchanged = false } = {}) {
  try {
    const raw = localStorage.getItem(LEGACY_MENU_OVERRIDES_KEY)
    if (raw === null) return true
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false
    let complete = true
    for (const record of records) {
      const values = parsed[record.field]
      if (values && typeof values === 'object' && !Array.isArray(values) && Object.hasOwn(values, record.id)) {
        if (onlyIfUnchanged && JSON.stringify(values[record.id]) !== JSON.stringify(record.value)) { complete = false; continue }
        delete values[record.id]
      } else if (onlyIfUnchanged) complete = false
    }
    for (const field of Object.keys(fieldConfig)) {
      if (parsed[field] && typeof parsed[field] === 'object' && !Array.isArray(parsed[field]) && Object.keys(parsed[field]).length === 0) delete parsed[field]
    }
    const remaining = Object.keys(parsed).length === 0
    if (remaining) localStorage.removeItem(LEGACY_MENU_OVERRIDES_KEY)
    else localStorage.setItem(LEGACY_MENU_OVERRIDES_KEY, JSON.stringify(parsed))
    return complete
  } catch { return false }
}

export function discardMalformedLegacyOverride(issue) {
  try {
    const raw = localStorage.getItem(LEGACY_MENU_OVERRIDES_KEY)
    if (raw === null) return true
    let parsed
    try { parsed = JSON.parse(raw) } catch {
      if (issue?.key !== 'malformed:json') return false
      localStorage.removeItem(LEGACY_MENU_OVERRIDES_KEY)
      return !hasLegacyMenuOverrides()
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      if (issue?.key !== 'malformed:root') return false
      localStorage.removeItem(LEGACY_MENU_OVERRIDES_KEY)
      return !hasLegacyMenuOverrides()
    }
    const field = issue?.key?.slice('malformed:'.length)
    if (!field || !Object.hasOwn(parsed, field)) return false
    delete parsed[field]
    if (Object.keys(parsed).length === 0) localStorage.removeItem(LEGACY_MENU_OVERRIDES_KEY)
    else localStorage.setItem(LEGACY_MENU_OVERRIDES_KEY, JSON.stringify(parsed))
    return true
  } catch { return false }
}

// Kept for the existing migration path; unlike the review flow it remains strict.
export function convertLegacyMenuOverrides(raw, snapshot) {
  const recovery = inspectLegacyMenuOverrides(raw, snapshot)
  const unresolved = [...recovery.records.filter((record) => record.status !== 'valid'), ...recovery.malformed]
  if (unresolved.length) {
    const first = unresolved[0]
    if (first.status === 'obsolete') throw new Error(`Saved browser edits refer to an item no longer in the menu: ${first.id}.`)
    throw new Error(first.reason || 'Saved browser edits need review.')
  }
  if (!recovery.records.length) return { schemaVersion: 1, revision: snapshot.revision, categories: snapshot.categories, items: snapshot.items }
  return buildLegacyRecoveryBackup(snapshot, recovery, recovery.records.map(({ key }) => key))
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
  } catch { return false }
}
