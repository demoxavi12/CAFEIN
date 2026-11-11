const sectionDisplayNames = new Map([
  ['Pastas', 'Pastas & Spaghettis'],
])

export function getMenuSectionLabel(section) {
  return sectionDisplayNames.get(section) ?? section
}
