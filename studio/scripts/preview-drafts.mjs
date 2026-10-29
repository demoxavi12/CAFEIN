import { getCliClient } from 'sanity/cli'
import { createDraftPreviewPayload } from '../../server/sanity-preview.mjs'

try {
  const client = getCliClient({ apiVersion: '2025-02-19' }).withConfig({
    projectId: 'kgt3bhzl',
    dataset: 'production',
    useCdn: false,
    perspective: 'drafts',
  })
  const payload = await createDraftPreviewPayload(client)
  process.stdout.write(`CAFEIN_DRAFT_PREVIEW_JSON:${JSON.stringify(payload)}`)
} catch {
  console.error('Authenticated Sanity draft preview failed. Check Studio CLI login, draft content, and dataset access. No token or secret was displayed.')
  process.exitCode = 1
}
