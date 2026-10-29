/** Return only deterministic draft documents not already present after a partial run. */
export function missingDraftDocuments(documents, existingDraftIds) {
  const ids = existingDraftIds instanceof Set ? existingDraftIds : new Set(existingDraftIds)
  return documents.filter((document) => !ids.has(document._id))
}

/** Reuse the lexically first existing asset ID for each SHA-1; never upload a duplicate. */
export function planImageAssets(images, existingAssets) {
  const byHash = new Map()
  for (const asset of existingAssets) {
    byHash.set(asset.sha1hash, [...(byHash.get(asset.sha1hash) || []), asset._id].sort())
  }
  const firstLocalSourceByHash = new Map()
  return images.map((image) => {
    const matches = byHash.get(image.sha1) || []
    const firstLocalSource = firstLocalSourceByHash.get(image.sha1)
    if (!firstLocalSource) firstLocalSourceByHash.set(image.sha1, image.sourcePath)
    return {
      ...image,
      existingAssetId: matches[0],
      duplicateAssetCount: Math.max(0, matches.length - 1),
      action: matches.length ? 'reuse-existing' : firstLocalSource ? 'reuse-planned' : 'upload',
    }
  })
}
