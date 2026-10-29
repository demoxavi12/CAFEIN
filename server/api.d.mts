import type { IncomingMessage, ServerResponse } from 'node:http'
import type { SeedMenu } from './seed.mjs'

export function createApiHandler(options: {
  seed: SeedMenu
  filePath: string
  env?: NodeJS.ProcessEnv
  clock?: () => number
}): (req: IncomingMessage, res: ServerResponse, next?: () => void) => Promise<void>
