import type { IncomingMessage, ServerResponse } from 'node:http'

export const SANITY_DRAFT_PREVIEW_PATH: string
export const EXPECTED_DRAFT_PREVIEW: Readonly<{
  categories: number
  menuItems: number
  specials: number
  realSpecialReferences: number
  temporarySpecialEntries: number
  imageAssets: number
}>
export const DRAFT_PREVIEW_QUERY: string

export function createDraftPreviewPayload(client: unknown, options?: Record<string, unknown>): Promise<unknown>
export function createSanityDraftPreviewHandler(options?: {
  runPreview?: () => Promise<unknown>
  cacheMs?: number
  now?: () => number
}): (req: IncomingMessage, res: ServerResponse, next?: () => void) => void
