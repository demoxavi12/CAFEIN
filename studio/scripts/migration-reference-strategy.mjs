/**
 * Sanity requires weak references while the target has no published document.
 * Keep _ref on the stable published ID; _strengthenOnPublish lets Sanity turn
 * it into a strong reference when the referring draft is published after its
 * target. Never reference the `drafts.` ID directly.
 */
export function unpublishedReference(targetId, targetType) {
  if (!targetId || targetId.startsWith('drafts.') || !targetType) {
    throw new Error('Draft references must use a stable published ID and target type.')
  }
  return {
    _type: 'reference',
    _ref: targetId,
    _weak: true,
    _strengthenOnPublish: { type: targetType },
  }
}
