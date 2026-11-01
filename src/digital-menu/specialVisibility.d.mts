interface SpecialMenuEntry { menuItem?: { id: string } | null }
export function filterArchivedSpecialEntries<T extends SpecialMenuEntry>(entries: T[], activeMenuIds: Set<string>): T[]
