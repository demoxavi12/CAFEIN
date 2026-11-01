export interface MenuSectionMapping {
  section: string
  category: string
}

export function getMenuSectionMappings(
  items: readonly { section: string; category: string }[],
  categories: readonly { id: string }[],
): MenuSectionMapping[]

export function getCategoryForMenuSection(
  section: string,
  mappings: readonly MenuSectionMapping[],
): string | null
