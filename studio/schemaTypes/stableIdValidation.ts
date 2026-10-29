import { getPublishedId, type NumberRule, type StringRule } from 'sanity'

const stableIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const apiVersion = '2026-10-29'

export function stableIdValidation(typeName: string) {
  return (rule: StringRule) =>
    stableIdFormatValidation(rule).custom(async (value, context) => {
      if (typeof value !== 'string' || !context.document?._id) return true

      const client = context.getClient({ apiVersion })
      const isTaken = await client.fetch<boolean>(
        `defined(*[_type == $type && id == $id && !sanity::versionOf($published)][0]._id)`,
        {
          type: typeName,
          id: value,
          published: getPublishedId(context.document._id),
        },
      )

      return isTaken ? `This ID is already used by another ${typeName}.` : true
    })
}

export function stableIdFormatValidation(rule: StringRule) {
  return rule
    .required()
    .min(1)
    .max(80)
    .regex(stableIdPattern, { name: 'lowercase letters, numbers and hyphens' })
}

export function nonnegativeIntegerValidation(rule: NumberRule) {
  return rule.required().integer().min(0)
}
