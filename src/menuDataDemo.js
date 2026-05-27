/**
 * Menu Data Demo File
 * Shows examples of how to use menuDataNoImages for each category and item
 */

import { menuDataNoImages } from './menuData.js';

// Get all unique categories
export const getCategories = () => {
  const categories = [...new Set(menuDataNoImages.map(item => item.category))];
  return categories;
};

// Get menu items by category
export const getItemsByCategory = (category) => {
  return menuDataNoImages.filter(item => item.category === category);
};

// Get single item by ID
export const getItemById = (id) => {
  return menuDataNoImages.find(item => item.id === id);
};

// Get all items sorted by price (ascending)
export const getItemsSortedByPrice = () => {
  return [...menuDataNoImages].sort((a, b) => a.price - b.price);
};

// Get all items sorted by price (descending)
export const getItemsSortedByPriceDesc = () => {
  return [...menuDataNoImages].sort((a, b) => b.price - a.price);
};

// Get items by price range
export const getItemsByPriceRange = (minPrice, maxPrice) => {
  return menuDataNoImages.filter(item => item.price >= minPrice && item.price <= maxPrice);
};

// Get total menu items count
export const getTotalMenuItems = () => {
  return menuDataNoImages.length;
};

// Get category summary with count
export const getCategorySummary = () => {
  const summary = {};
  getCategories().forEach(category => {
    summary[category] = getItemsByCategory(category).length;
  });
  return summary;
};

// Demo Usage Examples:
/*

// 1. Get all categories
const categories = getCategories();
console.log(categories);
// Output: ['Rice & Swallow', 'Stews & Soups', 'Spicy Fried', 'Side Dishes', 'Others', 'Continentals']

// 2. Get items in Rice & Swallow category
const riceItems = getItemsByCategory('Rice & Swallow');
console.log(riceItems);
// Output: [
//   { id: 1, name: 'Jollof Rice', price: 3500, desc: '...', category: 'Rice & Swallow' },
//   { id: 2, name: 'Fried Rice', price: 4000, desc: '...', category: 'Rice & Swallow' },
//   ...
// ]

// 3. Get single item by ID
const item = getItemById(1);
console.log(item);
// Output: { id: 1, name: 'Jollof Rice', price: 3500, desc: '...', category: 'Rice & Swallow' }

// 4. Get items sorted by price (cheapest to most expensive)
const sortedByPrice = getItemsSortedByPrice();

// 5. Get items sorted by price (most to least expensive)
const sortedByPriceDesc = getItemsSortedByPriceDesc();

// 6. Get items between 2000-4000 price range
const affordableItems = getItemsByPriceRange(2000, 4000);

// 7. Get total number of menu items
const totalItems = getTotalMenuItems();
console.log(totalItems); // Output: 22

// 8. Get category summary (how many items in each category)
const summary = getCategorySummary();
console.log(summary);
// Output: {
//   'Rice & Swallow': 5,
//   'Stews & Soups': 5,
//   'Spicy Fried': 2,
//   'Side Dishes': 2,
//   'Others': 2,
//   'Continentals': 6
// }

*/

// Category Breakdown:
export const CATEGORY_DETAILS = {
  'Rice & Swallow': {
    name: 'Rice & Swallow',
    description: 'Traditional rice and swallow dishes',
    itemCount: getItemsByCategory('Rice & Swallow').length,
    items: getItemsByCategory('Rice & Swallow')
  },
  'Stews & Soups': {
    name: 'Stews & Soups',
    description: 'Authentic Nigerian soups and stews',
    itemCount: getItemsByCategory('Stews & Soups').length,
    items: getItemsByCategory('Stews & Soups')
  },
  'Spicy Fried': {
    name: 'Spicy Fried',
    description: 'Crispy and spicy fried dishes',
    itemCount: getItemsByCategory('Spicy Fried').length,
    items: getItemsByCategory('Spicy Fried')
  },
  'Side Dishes': {
    name: 'Side Dishes',
    description: 'Tasty side dishes',
    itemCount: getItemsByCategory('Side Dishes').length,
    items: getItemsByCategory('Side Dishes')
  },
  'Others': {
    name: 'Others',
    description: 'Other specialty dishes',
    itemCount: getItemsByCategory('Others').length,
    items: getItemsByCategory('Others')
  },
  'Continentals': {
    name: 'Continentals',
    description: 'International cuisine with Nigerian twist',
    itemCount: getItemsByCategory('Continentals').length,
    items: getItemsByCategory('Continentals')
  }
};

export default menuDataNoImages;
