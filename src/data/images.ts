/**
 * Registry of the real Cafe In photographs (public/images).
 * Source files: /photos (Google listing screenshots, ~500px wide).
 * They were cropped only to remove browser UI artifacts and re-encoded as WebP.
 */
export interface ImageAsset {
  src: string
  alt: string
  width: number
  height: number
  /** Sanity asset document ID for server-side draft editing. */
  assetId?: string
  /** CSS object-position used when the image is cropped by its frame */
  focus?: string
}

export const images = {
  logo: {
    src: '/images/logo-svg.png',
    alt: 'Cafe In logo — Coffee • Vibes • Memories. Brew it. Love it. Live it!',
    width: 1254,
    height: 1254,
  },
  /** The supplied emblem padded to preserve the existing medallion image aspect ratio */
  logoMedallion: {
    src: '/images/logo-svg-medallion.png',
    alt: 'Cafe In logo — Coffee • Vibes • Memories. Brew it. Love it. Live it!',
    width: 1254,
    height: 850,
  },
  lantern: {
    src: '/images/interior-lantern-pendant.webp',
    alt: 'A geometric brass pendant lantern glowing warmly in front of the botanical mural at Cafe In',
    width: 453,
    height: 707,
    focus: '35% 50%',
  },
  diningRoom: {
    src: '/images/interior-dining-room.webp',
    alt: 'The Cafe In dining room: emerald velvet chairs, warm wooden tables, pendant lanterns and a pastel botanical mural',
    width: 494,
    height: 350,
    focus: '50% 55%',
  },
  muralWall: {
    src: '/images/interior-botanical-mural.webp',
    alt: 'A corner of Cafe In with a large tropical-leaf mural, emerald panelling and lanterns over wooden tables',
    width: 500,
    height: 348,
    focus: '40% 50%',
  },
  buddha: {
    src: '/images/decor-golden-buddha.webp',
    alt: 'A golden seated Buddha statue beside pink lilies on a wooden ledge at Cafe In',
    width: 458,
    height: 635,
    focus: '60% 50%',
  },
  alfredoPenne: {
    src: '/images/meal-alfredo-penne.webp',
    alt: 'Penne in a creamy white sauce with olives and peppers, served with a cup of black coffee on a wooden table',
    width: 498,
    height: 346,
    focus: '45% 55%',
  },
  biscoffCheesecake: {
    src: '/images/dessert-biscoff-cheesecake.webp',
    alt: 'A slice of cheesecake dripping with caramel Biscoff sauce on a pale blue plate',
    width: 458,
    height: 639,
    focus: '50% 75%',
  },
  burger: {
    src: '/images/dish-burger.webp',
    alt: 'Golden crisp toasted artisan burger layered with savory patty, fresh cucumber slices and garden greens',
    width: 410,
    height: 900,
    focus: '50% 50%',
  },
  greekSalad: {
    src: '/images/dish-greek-salad.webp',
    alt: 'Crisp Mediterranean Greek salad with diced cucumber, olives, herbs and fresh feta',
    width: 900,
    height: 410,
    focus: '50% 50%',
  },
  mushroomSpaghetti: {
    src: '/images/dish-mushroom-spaghetti.webp',
    alt: 'Freshly tossed spaghetti with sautéed sliced mushrooms, herbs, and garlic olive oil',
    width: 410,
    height: 900,
    focus: '50% 48%',
  },
  pistachioLatte: {
    src: '/images/dish-pistachio-latte.webp',
    alt: 'Iced Pistachio Latte topped with luxurious pistachio cold foam and espresso drizzle',
    width: 410,
    height: 900,
    focus: '50% 45%',
  },
  icedAmericano: {
    src: '/images/dish-iced-americano.webp',
    alt: 'Chilled iced Americano coffee in a tall glass with ice and rich crema',
    width: 410,
    height: 900,
    focus: '50% 40%',
  },
  arrabbiataPenne: {
    src: '/images/dish-arrabbiata-penne.webp',
    alt: 'Creamy Tuscan Penne pasta in rich spicy arrabbiata tomato sauce with black olives',
    width: 502,
    height: 900,
    focus: '50% 50%',
  },
  coldbrewSpecialty: {
    src: '/images/dish-coldbrew-specialty.webp',
    alt: 'Refreshing specialty cold brew with layered sparkling infusion',
    width: 410,
    height: 900,
    focus: '50% 50%',
  },
  icedLatte: {
    src: '/images/dish-iced-latte.webp',
    alt: 'Chilled iced latte with layered espresso, milk and rich velvety foam',
    width: 410,
    height: 900,
    focus: '50% 45%',
  },
  aglioOlio: {
    src: '/images/dish-aglio-olio.webp',
    alt: 'Spaghetti Aglio Olio tossed with garlic, herbs, and olives served alongside an iced coffee',
    width: 410,
    height: 900,
    focus: '50% 50%',
  },
  exteriorNight: {
    src: '/images/exterior-cafe-night.webp',
    alt: 'Cafe In welcoming exterior illuminated at night',
    width: 900,
    height: 410,
    focus: '50% 50%',
  },
  diningAtmosphere: {
    src: '/images/interior-dining-atmosphere.webp',
    alt: 'Warm and lively dining atmosphere at Cafe In with cozy lighting and guests enjoying coffee',
    width: 900,
    height: 409,
    focus: '50% 50%',
  },
} satisfies Record<string, ImageAsset>
