import type { StructureResolver } from 'sanity/structure'

export const deskStructure: StructureResolver = (S) =>
  S.list()
    .title('Cafe In content')
    .items([
      S.listItem()
        .title('Menu')
        .child(
          S.list()
            .title('Menu')
            .items([
              S.listItem()
                .title('Menu items')
                .child(S.documentTypeList('menuItem').title('Menu items').defaultOrdering([{ field: 'order', direction: 'asc' }])),
              S.listItem()
                .title('Categories')
                .child(S.documentTypeList('menuCategory').title('Categories').defaultOrdering([{ field: 'order', direction: 'asc' }])),
            ]),
        ),
      S.documentTypeListItem('special').title('Signature Specials'),
    ])
