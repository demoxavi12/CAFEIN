export interface SeedMenu {
  categories: Array<{ id: string; label: string; short: string; blurb: string }>
  items: Array<Record<string, unknown>>
}

export function loadSeedMenu(root?: string): SeedMenu
export function readBuiltSeed(root?: string): Promise<SeedMenu>
