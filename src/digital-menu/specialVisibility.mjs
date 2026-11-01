export function filterArchivedSpecialEntries(entries, activeMenuIds) {
  return entries.filter((entry) => !entry.menuItem || activeMenuIds.has(entry.menuItem.id))
}
