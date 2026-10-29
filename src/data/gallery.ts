import { images, type ImageAsset } from './images'

export interface GalleryItem {
  image: ImageAsset
  caption: string
  /** Layout slot in the asymmetric grid */
  span: 'tall' | 'wide' | 'square'
}

export const gallery: GalleryItem[] = [
  { image: images.diningRoom, caption: 'The dining room', span: 'wide' },
  { image: images.lantern, caption: 'Lantern light', span: 'tall' },
  { image: images.biscoffCheesecake, caption: 'Biscoff cheesecake', span: 'tall' },
  { image: images.muralWall, caption: 'The botanical wall', span: 'wide' },
  { image: images.buddha, caption: 'Quiet corners', span: 'tall' },
  { image: images.alfredoPenne, caption: 'Penne & a black coffee', span: 'wide' },
  {
    image: {
      src: '/images/dish-burger.webp',
      alt: 'A toasted burger layered with a patty, cucumber and greens',
      width: 410,
      height: 900,
    },
    caption: 'A toasted burger with fresh greens',
    span: 'tall',
  },
  { image: images.greekSalad, caption: 'A bowl of Greek salad', span: 'wide' },
  {
    image: images.mushroomSpaghetti,
    caption: 'Mushroom spaghetti',
    span: 'tall',
  },
  { image: images.pistachioLatte, caption: 'A pistachio iced latte', span: 'tall' },
  { image: images.icedAmericano, caption: 'Iced coffee by the window', span: 'tall' },
  { image: images.icedLatte, caption: 'A layered iced latte', span: 'tall' },
  { image: images.aglioOlio, caption: 'Pasta and iced coffee', span: 'tall' },
  { image: images.exteriorNight, caption: 'Cafe In after dusk', span: 'wide' },
  { image: images.diningAtmosphere, caption: 'Friends around the table', span: 'wide' },
  {
    image: {
      src: '/images/IMG_20260809_215809.jpg.jpeg',
      alt: 'A salad served at a table beside the cafe’s golden Buddha statue',
      width: 1864,
      height: 4096,
    },
    caption: 'A meal in a quiet corner',
    span: 'tall',
  },
  {
    image: {
      src: '/images/IMG_20260813_192951.jpg.jpeg',
      alt: 'A dark layered iced drink on a wooden table with soft floral details behind it',
      width: 1864,
      height: 4096,
    },
    caption: 'A layered iced coffee',
    span: 'tall',
  },
  {
    image: {
      src: '/images/IMG_20260905_202926.jpg.jpeg',
      alt: 'A frothy orange drink served in a handled glass mug',
      width: 1864,
      height: 4096,
    },
    caption: 'A frothy citrus drink',
    span: 'tall',
  },
  {
    image: {
      src: '/images/IMG_20260906_205200.jpg.jpeg',
      alt: 'A pale green and pink iced drink on a wooden table',
      width: 1864,
      height: 4096,
    },
    caption: 'A two-tone iced drink',
    span: 'tall',
  },
  {
    image: {
      src: '/images/IMG_20260928_194712.jpg.jpeg',
      alt: 'A chilled layered drink with a softly lit cafe interior behind it',
      width: 1864,
      height: 4096,
    },
    caption: 'A drink in the evening light',
    span: 'tall',
  },
]
