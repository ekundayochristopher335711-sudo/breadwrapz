export const DELIVERY_FEE = 500;
export const DELIVERY_RATE_PER_KM = 50;

export function calculatePaystackFee(amount) {
  if (amount <= 0) return 0;
  let fee = Math.ceil(amount * 0.015);
  if (amount > 2500) fee += 100;
  return Math.min(fee, 2000);
}

// Authoritative server-side price list — never trust prices from the client
export const MENU_PRICES = {
  1:  300,    // Amala
  2:  300,    // Semo
  3:  300,    // Eba
  4:  300,    // Fufu
  5:  10000,  // Large Pack
  6:  10000,  // Regular Pasta Pack
  7:  7500,   // Regular Rice Pack
  8:  500,    // Pasta
  9:  500,    // Yamatoes Porridge
  10: 4000,   // Ewa Agoyin
  11: 400,    // Grandma's Rice
  12: 400,    // Boiled Eggs
  13: 400,    // Fried Rice
  14: 500,    // Plantain
  15: 400,    // Jollof Rice
  16: 400,    // White Rice
  17: 6500,   // Grandma's Rice with Turkey or Chicken
  18: 2000,   // Thee Big Deal Porridge
  19: 2000,   // Grandma's Rice with Fried Fish
  20: 4000,   // Noodles
  21: 3000,   // Thee Big Deal Porridge (Chicken)
  22: 1500,   // Standard Shawarma
  23: 2000,   // Double Sausage Shawarma
  24: 0,      // Protein & Sides
};

export function calculateDeliveryFee(distanceKm) {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return DELIVERY_FEE;
  return Math.max(DELIVERY_FEE, Math.ceil(distanceKm) * DELIVERY_RATE_PER_KM);
}

export function calculateTotal(items, deliveryFee = DELIVERY_FEE) {
  if (!Array.isArray(items) || items.length === 0) return 0;
  const subtotal = items.reduce((sum, item) => sum + (MENU_PRICES[item.id] ?? 0) * (item.quantity || 1), 0);
  const withDelivery = subtotal + deliveryFee;
  const paystackFee = calculatePaystackFee(withDelivery);
  return withDelivery + paystackFee;
}
