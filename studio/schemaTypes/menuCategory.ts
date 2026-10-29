import { defineField, defineType } from 'sanity'
import { nonnegativeIntegerValidation, stableIdValidation } from './stableIdValidation'

export const menuCategory = defineType({
  name: 'menuCategory',
  title: 'Menu category',
  type: 'document',
  orderings: [
    { title: 'Display order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
  ],
  fields: [
    defineField({ name: 'id', title: 'Stable ID', type: 'string', validation: stableIdValidation('menuCategory') }),
    defineField({ name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required().min(1).max(80) }),
    defineField({ name: 'short', title: 'Short label', type: 'string', validation: (rule) => rule.required().min(1).max(40) }),
    defineField({ name: 'blurb', title: 'Description', type: 'text', rows: 2, validation: (rule) => rule.required().min(1).max(250) }),
    defineField({ name: 'order', title: 'Display order', type: 'number', validation: nonnegativeIntegerValidation }),
  ],
})
