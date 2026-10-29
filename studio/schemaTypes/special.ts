import { defineArrayMember, defineField, defineType } from 'sanity'
import { specialEntry } from './specialEntry'

type SpecialEntryValue = { id?: string; order?: number }

export const special = defineType({
  name: 'special',
  title: 'Signature Specials',
  type: 'document',
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow', type: 'string', validation: (rule) => rule.required().min(1).max(80) }),
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (rule) => rule.required().min(1).max(120) }),
    defineField({
      name: 'items',
      title: 'Carousel entries',
      type: 'array',
      of: [defineArrayMember({ type: specialEntry.name })],
      validation: (rule) => rule.required().min(1).custom<SpecialEntryValue[]>((entries) => {
        if (!entries) return true
        const ids = entries.map((entry) => entry.id).filter((id): id is string => Boolean(id))
        const orders = entries.map((entry) => entry.order).filter((order): order is number => Number.isInteger(order))
        if (new Set(ids).size !== ids.length) return 'Each entry must have a unique stable key.'
        if (new Set(orders).size !== orders.length) return 'Each entry must have a unique display order.'
        return true
      }),
    }),
  ],
})
