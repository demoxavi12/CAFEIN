/**
 * Cafe In menu — transcribed from the café's own printed menus
 * (docs/menu-reference/menu-beverages.jpeg and menu-eatables.jpeg).
 *
 * Section names ("Essence of Espresso", "Velvet Blends", …) are the café's own.
 * Prices are in Indian rupees exactly as printed.
 *
 * `needsConfirmation` marks anything that could not be read reliably from the
 * supplied screenshots. Those values are shown in the UI with a visible flag.
 */
import { images, type ImageAsset } from './images'

export type CategoryId = 'beverages' | 'quick-bites' | 'meals' | 'desserts'

export interface MenuCategory {
  id: CategoryId
  label: string
  short: string
  blurb: string
}

export interface MenuItem {
  id: string
  name: string
  price: number
  category: CategoryId
  /** The café's own section name on the printed menu */
  section: string
  description?: string
  /** Real Cafe In photograph of this exact dish, when one was supplied */
  image?: ImageAsset
  needsConfirmation?: string
}

export const categories: MenuCategory[] = [
  {
    id: 'beverages',
    label: 'Coffee & Beverages',
    short: 'Coffee',
    blurb: 'Espresso classics, velvet lattes, iced pours and frappés.',
  },
  {
    id: 'quick-bites',
    label: 'Quick Bites',
    short: 'Bites',
    blurb: 'Crisp, golden and made for sharing.',
  },
  {
    id: 'meals',
    label: 'Meals & Sandwiches',
    short: 'Meals',
    blurb: 'Pastas, burgers, subs, toasties and fresh bowls.',
  },
  {
    id: 'desserts',
    label: 'Desserts & Sweet Treats',
    short: 'Desserts',
    blurb: 'Brownies and cheesecakes from the Sweet Temptations counter.',
  },
]


export const menuItems: MenuItem[] = [
  // ── Essence of Espresso ────────────────────────────────────────────
  { id: 'espresso', name: 'Espresso', price: 50, category: 'beverages', section: 'Essence of Espresso', description: 'An intense, rich shot of pure coffee topped with a thick crema layer.' },
  { id: 'americano', name: 'Americano', price: 60, category: 'beverages', section: 'Essence of Espresso', description: 'A clean and balanced black coffee prepared by diluting espresso with hot water.' },
  { id: 'cortado', name: 'Cortado', price: 70, category: 'beverages', section: 'Essence of Espresso', description: 'A bold drink balancing intense espresso with an equal part of velvety steamed milk.' },
  { id: 'latte', name: 'Latte', price: 80, category: 'beverages', section: 'Essence of Espresso', description: 'A smooth, mild coffee made with rich espresso and generous steamed milk.' },
  { id: 'cappuccino', name: 'Cappuccino', price: 80, category: 'beverages', section: 'Essence of Espresso', description: 'A classic coffee crowned with a dense layer of creamy milk foam.' },

  // ── Velvet Blends ──────────────────────────────────────────────────
  { id: 'mocha', name: 'Mocha', price: 100, category: 'beverages', section: 'Velvet Blends', description: 'A velvety blend combining rich espresso with dark cocoa and milk.' },
  { id: 'cinnamon-latte', name: 'Cinnamon Latte', price: 120, category: 'beverages', section: 'Velvet Blends', description: 'A warm, aromatic espresso drink infused with smooth cinnamon spice.' },
  { id: 'biscoff-latte', name: 'Biscoff Latte', price: 120, category: 'beverages', section: 'Velvet Blends', description: 'A rich espresso beverage layered with spiced caramel speculoos biscuit flavors.' },
  { id: 'vanilla-latte', name: 'Vanilla Latte', price: 100, category: 'beverages', section: 'Velvet Blends', description: 'A smooth and sweet espresso drink lightly flavored with vanilla.' },
  { id: 'hazelnut-latte', name: 'Hazelnut Latte', price: 100, category: 'beverages', section: 'Velvet Blends', description: 'A smooth espresso beverage featuring roasted, nutty hazelnut notes.' },
  { id: 'irish-cream-latte', name: 'Irish Cream Latte', price: 100, category: 'beverages', section: 'Velvet Blends', description: 'A creamy, velvety drink infused with non-alcoholic Irish cream notes.' },
  { id: 'tiramisu-latte', name: 'Tiramisu Latte', price: 100, category: 'beverages', section: 'Velvet Blends', description: 'A dessert-inspired espresso beverage with cocoa and Italian tiramisu flavor.' },
  { id: 'pistachio-latte', name: 'Pistachio Latte', price: 120, category: 'beverages', section: 'Velvet Blends', description: 'A bold coffee drink layered with rich, nutty pistachio flavor and a velvety finish.', image: images.pistachioLatte },

  // ── Chilled Chronicles ─────────────────────────────────────────────
  { id: 'iced-americano', name: 'Iced Americano', price: 70, category: 'beverages', section: 'Chilled Chronicles', description: 'A crisp, bold, and refreshing chilled espresso served over ice and water.', image: images.icedAmericano },
  { id: 'iced-latte', name: 'Iced Latte', price: 100, category: 'beverages', section: 'Chilled Chronicles', description: 'A smooth, creamy cold coffee made with chilled milk and espresso.', image: images.icedLatte },
  { id: 'vietnamese-iced-coffee', name: 'Vietnamese Iced Coffee', price: 120, category: 'beverages', section: 'Chilled Chronicles', description: 'A strong, sweet chilled coffee brewed robustly with sweetened condensed milk.', image: images.coldbrewSpecialty },
  { id: 'affogato', name: 'Affogato', price: 120, category: 'beverages', section: 'Chilled Chronicles', description: 'A rich dessert pairing a hot shot of espresso poured directly over vanilla ice cream.' },

  // ── Frosted Creations ──────────────────────────────────────────────
  { id: 'iced-mocha', name: 'Iced Mocha', price: 120, category: 'beverages', section: 'Frosted Creations', description: 'A frosty, velvety chilled blend of rich chocolate, espresso, and milk.' },
  { id: 'iced-vanilla-latte', name: 'Iced Vanilla Latte', price: 120, category: 'beverages', section: 'Frosted Creations', description: 'A sweet, smooth iced coffee infused with fragrant vanilla syrup.' },
  { id: 'iced-hazelnut-latte', name: 'Iced Hazelnut Latte', price: 120, category: 'beverages', section: 'Frosted Creations', description: 'A chilled espresso drink cascading with nutty hazelnut flavor.' },
  { id: 'iced-irish-cream-latte', name: 'Iced Irish Cream Latte', price: 120, category: 'beverages', section: 'Frosted Creations', description: 'A cool, creamy iced coffee flavored with rich Irish cream.' },
  { id: 'iced-tiramisu-latte', name: 'Iced Tiramisu Latte', price: 120, category: 'beverages', section: 'Frosted Creations', description: 'A frozen treat combining chocolate, coffee, and classic tiramisu notes.' },

  // ── Blender & Chill ────────────────────────────────────────────────
  { id: 'classic-coffee-frappe', name: 'Classic Coffee Frappe', price: 160, category: 'beverages', section: 'Blender & Chill', description: 'A cold, creamy, and indulgent blended coffee slush.' },
  { id: 'mocha-frappe', name: 'Mocha Frappe', price: 180, category: 'beverages', section: 'Blender & Chill', description: 'A bold icy blend of dark chocolate, coffee, and whipped cream.' },
  { id: 'biscoff-frappe', name: 'Biscoff Frappe', price: 180, category: 'beverages', section: 'Blender & Chill', description: 'An indulgent blended freeze featuring caramel Biscoff cookie flavor.' },

  // ── Beyond Coffee ──────────────────────────────────────────────────
  {
    id: 'hot-chocolate',
    name: 'Hot Chocolate',
    price: 100,
    category: 'beverages',
    section: 'Beyond Coffee',
    description: 'A warm, comforting mug of thick, melted cocoa and steamed milk.',
  },

  // ── Crisp & Quick ──────────────────────────────────────────────────
  { id: 'french-fries', name: 'French Fries', price: 90, category: 'quick-bites', section: 'Crisp & Quick', description: 'Golden, crispy potato batons fried to a crunch and lightly salted.' },
  { id: 'loaded-french-fries', name: 'Loaded French Fries', price: 120, category: 'quick-bites', section: 'Crisp & Quick', description: 'Crispy golden fries topped with melted cheese sauce and savory garnishes.' },
  { id: 'peri-peri-french-fries', name: 'Peri Peri French Fries', price: 100, category: 'quick-bites', section: 'Crisp & Quick', description: 'Crispy fries tossed in a spicy, addictive peri peri seasoning.' },
  { id: 'potato-wedges', name: 'Potato Wedges', price: 120, category: 'quick-bites', section: 'Crisp & Quick', description: 'Thick, rustic herb-seasoned potato wedges with a crisp exterior and soft center.' },
  { id: 'veg-fingers', name: 'Veg Fingers', price: 130, category: 'quick-bites', section: 'Crisp & Quick', description: 'Savory vegetable mix shaped into crunchy, deep-fried baton sticks.' },
  { id: 'veg-nuggets', name: 'Veg Nuggets', price: 130, category: 'quick-bites', section: 'Crisp & Quick', description: 'Golden, bite-sized vegetable bites coated in a crispy breading.' },
  { id: 'potato-cheese-shots', name: 'Potato Cheese Shots', price: 140, category: 'quick-bites', section: 'Crisp & Quick', description: 'Crispy potato spheres packed with melted, gooey cheese inside.' },
  { id: 'nachos-salsa', name: 'Nachos & Salsa', price: 150, category: 'quick-bites', section: 'Crisp & Quick', description: 'A shareable tray of crunchy tortilla chips served with tangy salsa.' },

  // ── Pastas ─────────────────────────────────────────────────────────
  { id: 'aglio-olio-spaghetti', name: 'Aglio Olio Spaghetti', price: 180, category: 'meals', section: 'Pastas', description: 'Classic spaghetti pasta tossed with garlic, olive oil, and red chili flakes.', image: images.aglioOlio },
  { id: 'mushroom-aglio-olio-spaghetti', name: 'Mushroom Aglio Olio Spaghetti', price: 200, category: 'meals', section: 'Pastas', description: 'Garlic and olive oil spaghetti elevated with sautéed mushrooms.', image: images.mushroomSpaghetti },
  { id: 'arrabbiata-spaghetti', name: 'Arrabbiata Spaghetti', price: 200, category: 'meals', section: 'Pastas', description: 'Spaghetti coated in a fiery, garlic-infused tomato arrabbiata sauce.' },
  { id: 'alfredo-spaghetti', name: 'Alfredo Spaghetti', price: 220, category: 'meals', section: 'Pastas', description: 'Spaghetti wrapped in a rich, velvety parmesan and cream garlic sauce.' },
  { id: 'cream-of-mushroom-spaghetti', name: 'Cream of Mushroom Spaghetti', price: 250, category: 'meals', section: 'Pastas', description: 'Spaghetti tossed in a smooth, savory mushroom cream sauce.', image: images.mushroomSpaghetti },
  {
    id: 'alfredo-penne', name: 'Alfredo Penne', price: 150, category: 'meals', section: 'Pastas',
    description: 'Penne pasta cooked in an indulgent, rich cream and cheese sauce.',
    image: images.alfredoPenne,
  },
  { id: 'arrabbiata-penne', name: 'Arrabbiata Penne', price: 160, category: 'meals', section: 'Pastas', description: 'Penne pasta tossed in a spicy, tangy tomato sauce.', image: images.arrabbiataPenne },

  // ── Burgers ────────────────────────────────────────────────────────
  { id: 'burger-aloo-tikki', name: 'Burger Aloo Tikki', price: 100, category: 'meals', section: 'Burgers', description: 'Spiced potato patty burger with fresh veggies and sauce.', image: images.burger },
  { id: 'burger-paneer', name: 'Burger Paneer', price: 120, category: 'meals', section: 'Burgers', description: 'Crispy paneer patty with spicy mayo and lettuce.', image: images.burger },

  // ── Submarines ─────────────────────────────────────────────────────
  { id: 'subway-veg', name: 'Subway Veg', price: 140, category: 'meals', section: 'Submarines', description: 'A fresh submarine sandwich packed with crisp garden vegetables and dressings.' },
  { id: 'subway-paneer', name: 'Subway Paneer', price: 160, category: 'meals', section: 'Submarines', description: 'A hearty submarine sandwich stuffed with spiced paneer cubes and fresh veggies.' },

  // ── Pressed & Layered ──────────────────────────────────────────────
  { id: 'vegetable-sandwich', name: 'Vegetable Sandwich', price: 100, category: 'meals', section: 'Pressed & Layered', description: 'A light, toasted sandwich loaded with fresh, crisp garden vegetables.' },
  { id: 'paneer-sandwich', name: 'Paneer Sandwich', price: 130, category: 'meals', section: 'Pressed & Layered', description: 'A warm, filling toasted sandwich stuffed with seasoned paneer filling.' },
  { id: 'mushroom-sandwich', name: 'Mushroom Sandwich', price: 130, category: 'meals', section: 'Pressed & Layered', description: 'A flavorful toasted sandwich with sautéed mushrooms and herbs.' },
  { id: 'corn-cheese-sandwich', name: 'Corn Cheese Sandwich', price: 140, category: 'meals', section: 'Pressed & Layered', description: 'A comforting toasted sandwich packed with sweet corn and melted cheese.' },

  // ── Farm Fresh Bowls ───────────────────────────────────────────────
  { id: 'greek-salad', name: 'Greek Salad', price: 160, category: 'meals', section: 'Farm Fresh Bowls', description: 'A fresh, crisp bowl of garden vegetables tossed with Mediterranean herbs.', image: images.greekSalad },
  { id: 'caesar-salad', name: 'Caesar Salad', price: 180, category: 'meals', section: 'Farm Fresh Bowls', description: 'Crunchy greens tossed in a creamy, savory Caesar dressing with croutons.' },

  // ── Sweet Temptations ──────────────────────────────────────────────
  {
    id: 'walnut-brownie',
    name: 'Walnut Brownie',
    price: 80,
    category: 'desserts',
    section: 'Sweet Temptations',
    description: 'A fudgy, dense chocolate block brownie packed with crunchy walnuts.',
  },
  {
    id: 'brownie-with-ice-cream',
    name: 'Brownie with Ice Cream',
    price: 100,
    category: 'desserts',
    section: 'Sweet Temptations',
    description: 'A warm chocolate brownie served hot alongside a scoop of cold vanilla ice cream.',
  },
  {
    id: 'classic-cheesecake',
    name: 'Classic Cheesecake',
    price: 150,
    category: 'desserts',
    section: 'Sweet Temptations',
    description: 'A smooth, creamy original cheesecake slice on a buttery graham crust.',
  },
  {
    id: 'blueberry-cheesecake',
    name: 'Blueberry Cheesecake',
    price: 170,
    category: 'desserts',
    section: 'Sweet Temptations',
    description: 'A rich cheesecake slice layered with a sweet and tangy blueberry topping.',
  },
  {
    id: 'mango-cheesecake',
    name: 'Mango Cheesecake',
    price: 170,
    category: 'desserts',
    section: 'Sweet Temptations',
    description: 'A creamy tropical cheesecake slice infused with fresh mango puree.',
  },
  {
    id: 'biscoff-cheesecake',
    name: 'Biscoff Cheesecake',
    price: 170,
    category: 'desserts',
    section: 'Sweet Temptations',
    description: 'A spiced, caramel-rich cheesecake topped with crushed Biscoff biscuit.',
    image: images.biscoffCheesecake,
  },
  {
    id: 'nutella-cheesecake',
    name: 'Nutella Cheesecake',
    price: 170,
    category: 'desserts',
    section: 'Sweet Temptations',
    description: 'An indulgent cheesecake slice blended with rich Nutella chocolate hazelnut spread.',
  },
]

export const formatPrice = (price: number) => `₹${price}`
