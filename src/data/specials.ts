/**
 * Signature Specials — a curated selection from the real menu.
 * Edit `ids` to change what is featured; content is pulled from menu.ts.
 * Items with a real photograph get a photographic panel; others get a
 * typographic panel (no stock imagery is ever substituted).
 */
import { menuItems, type MenuItem } from './menu'
import { images } from './images'

export const specials = {
  eyebrow: 'Signature Specials',
  title: 'Worth the detour',
  ids: ['biscoff-cheesecake', 'alfredo-penne', 'biscoff-latte', 'vietnamese-iced-coffee'],
}

const verifiedFeaturedItems: MenuItem[] = specials.ids
  .map((id) => menuItems.find((m) => m.id === id))
  .filter((m): m is MenuItem => Boolean(m))

// Temporary carousel entries for layout evaluation; replace with verified menu details later.
const temporaryItems: MenuItem[] = [
  { id: 'temp-cappuccino', name: 'Honeycomb Cappuccino', price: 140, category: 'beverages', section: 'Temporary Coffee Specials', description: 'A creamy cappuccino with a gentle honey sweetness and a soft cocoa finish.', image: images.lantern },
  { id: 'temp-chocolate-tart', name: 'Dark Chocolate Tart', price: 190, category: 'desserts', section: 'Temporary Sweet Treats', description: 'A rich chocolate tart with a crisp pastry shell and a smooth, bittersweet centre.', image: images.biscoffCheesecake },
  { id: 'temp-herb-pasta', name: 'Garden Herb Pasta', price: 220, category: 'meals', section: 'Temporary Café Plates', description: 'A comforting pasta tossed with herbs, seasonal vegetables and a light cream sauce.', image: images.alfredoPenne },
  { id: 'temp-iced-mocha', name: 'Velvet Iced Mocha', price: 160, category: 'beverages', section: 'Temporary Coffee Specials', description: 'Chilled espresso and cocoa blended with milk for a smooth, refreshing finish.', image: images.muralWall },
  { id: 'temp-cafe-toastie', name: 'Café Garden Toastie', price: 180, category: 'quick-bites', section: 'Temporary Café Plates', description: 'A warm, toasted café sandwich with a savoury filling and a golden, crisp bite.', image: images.diningRoom },
  { id: 'temp-caramel-pudding', name: 'Caramel Cloud Pudding', price: 150, category: 'desserts', section: 'Temporary Sweet Treats', description: 'A silky caramel dessert with a delicate sweetness and a soft, creamy texture.', image: images.buddha },
]

export const featuredItems: MenuItem[] = [...verifiedFeaturedItems, ...temporaryItems]
