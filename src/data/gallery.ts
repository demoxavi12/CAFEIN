import {
  numberedGalleryAssets,
  type NumberedGalleryAsset,
} from 'virtual:cafe-in-gallery-assets'
import type { ImageAsset } from './images'

export type GalleryLayout =
  | 'large-portrait'
  | 'small-portrait'
  | 'large-landscape'
  | 'small-landscape'
  | 'square'
  | 'tall-vertical'
  | 'wide-horizontal'

export interface GalleryPlacement {
  /** One-based desktop column. */
  column: number
  /** One-based position within the column. */
  row: number
}

export interface GalleryItem {
  id: string
  image: ImageAsset
  caption: string
  /** Source image number, also used for the small frame marker. */
  number: number
  /** Gallery/lightbox order. */
  order: number
  layout: GalleryLayout
  placement?: GalleryPlacement
  /** Optional CSS aspect-ratio value such as "4 / 3". */
  aspectRatio?: string
}

type GalleryOverride = Partial<
  Pick<GalleryItem, 'caption' | 'number' | 'order' | 'layout' | 'placement' | 'aspectRatio'>
> & {
  alt?: string
  objectPosition?: string
}

/**
 * Editorial overrides live here, separate from rendering. Unlisted photos are
 * discovered from public/images/gallery and arranged in numeric order.
 */
const overrides: Partial<Record<number, GalleryOverride>> = {
  1: {
    caption: 'Cafe In at the entrance',
    alt: 'Cafe In name displayed on a sign at the entrance',
    layout: 'wide-horizontal',
    placement: { column: 1, row: 1 },
  },
  2: {
    caption: 'A Cafe In takeaway cup',
    alt: 'Cafe In takeaway cup held outside the cafe',
    layout: 'small-portrait',
  },
  3: {
    caption: 'Coffee to take along',
    alt: 'Cafe In takeaway cup held among the greenery',
    layout: 'small-portrait',
  },
  4: {
    caption: 'A table under the lanterns',
    alt: 'Wooden cafe table and green seating beneath warm pendant lights',
    layout: 'large-landscape',
  },
  5: {
    caption: 'The dining room',
    alt: 'Cafe In dining tables arranged beside the windows',
    layout: 'large-landscape',
  },
  7: {
    caption: 'Lantern light',
    alt: 'A geometric pendant lantern glowing inside Cafe In',
    layout: 'tall-vertical',
    placement: { column: 2, row: 1 },
  },
  8: {
    caption: 'The botanical wall',
    alt: 'Cafe In botanical mural, emerald wall panels and pendant lights',
    layout: 'wide-horizontal',
    placement: { column: 2, row: 2 },
    objectPosition: 'center 45%',
  },
  9: {
    caption: 'A closer look at the lantern',
    alt: 'Close-up of a glowing geometric pendant lantern',
    layout: 'large-portrait',
  },
  10: {
    caption: 'Around the table',
    alt: 'Guests sharing a meal at Cafe In',
    layout: 'large-landscape',
  },
  11: {
    caption: 'Coffee at the table',
    alt: 'A cup of coffee on a wooden Cafe In table',
    layout: 'square',
  },
  12: {
    caption: 'Behind the counter',
    alt: 'Coffee preparation equipment at the Cafe In counter',
    layout: 'small-portrait',
  },
  13: {
    caption: 'A quiet corner',
    alt: 'Golden Buddha decor beside flowers inside Cafe In',
    layout: 'small-portrait',
  },
  14: {
    caption: 'A cup by the window',
    alt: 'A cup of coffee beside a Cafe In window',
    layout: 'small-landscape',
  },
  15: {
    caption: 'Brownie and ice cream',
    alt: 'Chocolate brownie served with a scoop of ice cream',
    layout: 'small-portrait',
  },
  16: {
    caption: 'Fresh greens',
    alt: 'A fresh green salad served on a plate',
    layout: 'square',
  },
  17: {
    caption: 'A table set for sharing',
    alt: 'A selection of cafe dishes and drinks on a table',
    layout: 'large-landscape',
  },
  18: {
    caption: 'Something to share',
    alt: 'A dessert platter served at Cafe In',
    layout: 'large-landscape',
  },
  19: {
    caption: 'A chocolate dessert',
    alt: 'A chocolate dessert on a plate',
    layout: 'square',
  },
  20: {
    caption: 'Latte art',
    alt: 'Latte art on a coffee served at Cafe In',
    layout: 'small-portrait',
  },
  22: {
    caption: 'Creamy Tuscan pasta',
    alt: 'Cafe In creamy Tuscan pasta feature image',
    layout: 'tall-vertical',
  },
  23: {
    caption: 'A chilled coffee',
    alt: 'A glass of iced coffee beside the Cafe In window',
    layout: 'small-portrait',
  },
  24: {
    caption: 'A cool citrus pour',
    alt: 'A golden iced drink being poured into a glass',
    layout: 'small-portrait',
  },
  25: {
    caption: 'Pasta and coffee',
    alt: 'A pasta dish and cup of coffee on a wooden table',
    layout: 'large-landscape',
  },
  26: {
    caption: 'A fresh pour',
    alt: 'Coffee being poured into a cup',
    layout: 'wide-horizontal',
  },
  27: {
    caption: 'Cheesecake on the table',
    alt: 'A slice of cheesecake on a blue plate',
    layout: 'large-portrait',
  },
}

const automaticLayouts: GalleryLayout[] = [
  'small-landscape',
  'small-portrait',
  'square',
  'large-landscape',
  'small-portrait',
  'tall-vertical',
]

function toGalleryItem(asset: NumberedGalleryAsset): GalleryItem {
  const override = overrides[asset.number]
  const { objectPosition, ...itemOverride } = override ?? {}
  return {
    id: `gallery-${asset.number}`,
    image: {
      src: asset.src,
      alt: itemOverride.alt ?? `Cafe In photograph ${asset.number}`,
      width: asset.width,
      height: asset.height,
      focus: objectPosition,
    },
    caption: itemOverride.caption ?? `Cafe In moment ${asset.number}`,
    number: itemOverride.number ?? asset.number,
    order: itemOverride.order ?? asset.number,
    layout: itemOverride.layout ?? automaticLayouts[(asset.number - 1) % automaticLayouts.length],
    placement: itemOverride.placement,
    aspectRatio: itemOverride.aspectRatio,
  }
}

export const gallery: GalleryItem[] = numberedGalleryAssets
  .map(toGalleryItem)
  .sort((left, right) => left.order - right.order || left.number - right.number)
