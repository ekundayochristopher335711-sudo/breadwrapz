import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, 'orders.json');

let orders;

async function loadOrders() {
  if (orders) return orders;

  try {
    const content = await fs.readFile(dataPath, 'utf8');
    orders = JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      orders = [];
    } else {
      throw error;
    }
  }

  return orders;
}

async function saveOrders() {
  orders = orders || [];
  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.writeFile(dataPath, JSON.stringify(orders, null, 2), 'utf8');
}

export async function createOrder(order) {
  orders = await loadOrders();
  orders.push(order);
  await saveOrders();
  return order;
}

export async function getOrder(orderId) {
  const list = await loadOrders();
  return list.find((order) => order.orderId === orderId);
}

export async function getOrderByReference(reference) {
  const list = await loadOrders();
  return list.find((order) => order.reference === reference);
}

export async function updateOrder(orderId, updates) {
  orders = await loadOrders();
  const index = orders.findIndex((order) => order.orderId === orderId);
  if (index === -1) return null;

  orders[index] = {
    ...orders[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveOrders();
  return orders[index];
}
