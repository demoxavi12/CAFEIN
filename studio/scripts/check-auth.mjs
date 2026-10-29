import { getCliClient } from 'sanity/cli'

try {
  const client = getCliClient({ apiVersion: '2025-02-19' }).withConfig({
    projectId: 'kgt3bhzl',
    dataset: 'production',
    useCdn: false,
    perspective: 'raw',
  })
  const config = client.config()
  console.log(`CLI client target: ${config.projectId}/${config.dataset}; API ${config.apiVersion}; raw perspective.`)
  const documents = await client.fetch('*[_type in ["menuCategory", "menuItem", "special"]]{_id,_type}')
  const counts = Object.fromEntries(['menuCategory', 'menuItem', 'special'].map((type) => {
    const typed = documents.filter((document) => document._type === type)
    return [type, {
      drafts: typed.filter(({ _id }) => _id.startsWith('drafts.')).length,
      published: typed.filter(({ _id }) => !_id.startsWith('drafts.')).length,
    }]
  }))
  console.log(`Authenticated raw-perspective dataset read succeeded for ${client.config().projectId}/${client.config().dataset}.`)
  console.log(JSON.stringify(counts))
} catch (error) {
  const errorText = error instanceof Error ? error.message : ''
  const reason = /\b401\b|\b403\b|unauthori[sz]ed|forbidden/i.test(errorText)
    ? 'the user token was rejected or lacks dataset read permission'
    : /ENOTFOUND|ECONN|network|fetch failed/i.test(errorText)
      ? 'the dataset request could not reach Sanity'
      : 'the CLI user-token dataset query failed'
  const status = error && typeof error === 'object'
    ? (error.statusCode || error.status || error.response?.statusCode || 'unknown')
    : 'unknown'
  const errorName = error instanceof Error ? error.name : 'Error'
  const safeMessage = errorText
    .replace(/https?:\/\/\S+/gi, '[request URL omitted]')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .replace(/([?&](?:token|authorization)=)[^&\s]+/gi, '$1[redacted]')
    .replace(/\bsk[a-zA-Z0-9_-]{20,}\b/g, '[redacted]')
    .slice(0, 200)
  console.error(`Sanity CLI authenticated read-only access failed: ${reason}; ${errorName}; status=${status}; ${safeMessage || 'no safe error message available'}. No token or secret was displayed.`)
  process.exitCode = 1
}
