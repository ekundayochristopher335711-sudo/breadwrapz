export const DELIVERY_FEE = 500;
export const DELIVERY_RATE_PER_KM = 50;

export const MENU_PRICES: Record<number, number> = {
  1:  300,
  2:  300,
  3:  300,
  4:  300,
  5:  10000,
  6:  10000,
  7:  7500,
  8:  500,
  9:  500,
  10: 4000,
  11: 400,
  12: 400,
  13: 400,
  14: 500,
  15: 400,
  16: 400,
  17: 6500,
  18: 2000,
  19: 2000,
  20: 4000,
  21: 3000,
  22: 1500,
  23: 2000,
  24: 0,
};

export function calculatePaystackFee(amount: number): number {
  if (amount <= 0) return 0;
  let fee = Math.ceil(amount * 0.015);
  if (amount > 2500) fee += 100;
  return Math.min(fee, 2000);
}

export function calculateDeliveryFee(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return DELIVERY_FEE;
  return Math.max(DELIVERY_FEE, Math.ceil(distanceKm) * DELIVERY_RATE_PER_KM);
}

export function calculateTotal(
  items: Array<{ id: number | string; quantity?: number }>,
  deliveryFee = DELIVERY_FEE,
): number {
  if (!Array.isArray(items) || items.length === 0) return 0;
  const subtotal = items.reduce(
    (sum, item) => sum + (MENU_PRICES[Number(item.id)] ?? 0) * (item.quantity || 1),
    0,
  );
  const withDelivery = subtotal + deliveryFee;
  return withDelivery + calculatePaystackFee(withDelivery);
}
