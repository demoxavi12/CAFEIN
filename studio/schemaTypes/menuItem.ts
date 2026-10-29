import { defineField, defineType } from 'sanity'
import { nonnegativeIntegerValidation, stableIdValidation } from './stableIdValidation'

export const menuItem = defineType({
  name: 'menuItem',
  title: 'Menu item',
  type: 'document',
  orderings: [
    { title: 'Display order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
    { title: 'Name', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] },
  ],
  fields: [
    defineField({ name: 'id', title: 'Stable ID', type: 'string', validation: stableIdValidation('menuItem') }),
    defineField({ name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required().min(1).max(80) }),
    defineField({
      name: 'price',
      title: 'Price (₹, whole rupees)',
      type: 'number',
      validation: (rule) => rule.required().integer().min(0).max(100000),
    }),
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
        defineField({ name: 'objectPosition', title: 'Legacy image focus', type: 'string', description: 'Optional CSS object-position value retained from the current image registry.', validation: (rule) => rule.max(50) }),
      ],
    }),
    defineField({ name: 'needsConfirmation', title: 'Confirmation note', type: 'text', rows: 2, validation: (rule) => rule.max(250) }),
    defineField({
      name: 'isSoldOut',
      title: 'Sold out',
      type: 'boolean',
      initialValue: false,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'badge',
      title: 'Badge',
      type: 'string',
      options: { list: ['Bestseller', 'Chef Special'], layout: 'radio' },
      validation: (rule) => rule.custom((value) =>
        value === undefined || value === 'Bestseller' || value === 'Chef Special'
          ? true
          : 'Choose Bestseller or Chef Special.',
      ),
    }),
    defineField({ name: 'order', title: 'Display order', type: 'number', validation: nonnegativeIntegerValidation }),
  ],
})
