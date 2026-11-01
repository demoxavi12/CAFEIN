/**
 * Derives the supported Gourmet section → parent category relationship from
 * the canonical menu records. A section that appears under multiple parents
 * is intentionally omitted so ambiguous taxonomy cannot be assigned.
 */
export function getMenuSectionMappings(items, categories) {
  const validCategories = new Set(categories.map((category) => category.id))
  const sections = new Map()

  for (const item of items) {
    if (typeof item.section !== 'string' || !item.section.trim() || !validCategories.has(item.category)) continue
    const existing = sections.get(item.section)
    if (existing === undefined) sections.set(item.section, item.category)
    else if (existing !== item.category) sections.set(item.section, null)
  }

  return [...sections]
    .filter((entry) => entry[1] !== null)
    .map(([section, category]) => ({ section, category }))
    .sort((left, right) => left.section.localeCompare(right.section))
}

export function getCategoryForMenuSection(section, mappings) {
  return mappings.find((mapping) => mapping.section === section)?.category ?? null
}
