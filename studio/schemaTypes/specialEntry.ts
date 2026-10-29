import { defineField, defineType } from 'sanity'
import { nonnegativeIntegerValidation, stableIdFormatValidation } from './stableIdValidation'

type SpecialEntryValue = {
  menuItem?: { _ref?: string }
  temporaryContent?: Record<string, unknown>
}

export const specialEntry = defineType({
  name: 'specialEntry',
  title: 'Special entry',
  type: 'object',
  fields: [
    defineField({ name: 'id', title: 'Stable key', type: 'string', validation: stableIdFormatValidation }),
    defineField({ name: 'order', title: 'Display order', type: 'number', validation: nonnegativeIntegerValidation }),
    defineField({
      name: 'menuItem',
      title: 'Existing menu item',
      type: 'reference',
      weak: true,
      to: [{ type: 'menuItem' }],
      options: {
        filter: '_type == "menuItem"',
      },
      hidden: ({ parent }) => Boolean(parent?.temporaryContent),
    }),
    defineField({
      name: 'temporaryContent',
      title: 'Temporary card content',
      type: 'object',
      hidden: ({ parent }) => Boolean(parent?.menuItem?._ref),
      fields: [
        defineField({ name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required().min(1).max(80) }),
        defineField({ name: 'price', title: 'Price (₹, whole rupees)', type: 'number', validation: (rule) => rule.required().integer().min(0).max(100000) }),
        defineField({
          name: 'category',
          title: 'Category',
          type: 'reference',
          weak: true,
          to: [{ type: 'menuCategory' }],
          options: { filter: '_type == "menuCategory"' },
          validation: (rule) => rule.required(),
        }),
        defineField({ name: 'section', title: 'Menu section', type: 'string', validation: (rule) => rule.required().min(1).max(80) }),
        defineField({ name: 'description', title: 'Description', type: 'text', rows: 3, validation: (rule) => rule.max(500) }),
        defineField({
          name: 'image',
          title: 'Image',
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({ name: 'alt', title: 'Alternative text', type: 'string', validation: (rule) => rule.required().min(1).max(300) }),
            defineField({ name: 'objectPosition', title: 'Legacy image focus', type: 'string', validation: (rule) => rule.max(50) }),
          ],
        }),
      ],
    }),
  ],
  validation: (rule) => rule.custom<SpecialEntryValue>((value) => {
    const hasReference = Boolean(value?.menuItem?._ref)
    const hasTemporaryContent = Boolean(value?.temporaryContent)
    return hasReference !== hasTemporaryContent
      ? true
      : 'Choose exactly one existing menu item or temporary card content.'
  }),
})
