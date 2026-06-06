import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);
let col;

async function getCollection() {
  if (!col) {
    await client.connect();
    col = client.db('breadwrapz').collection('orders');
    await col.createIndex({ orderId: 1 }, { unique: true });
    await col.createIndex({ reference: 1 });
  }
  return col;
}

export async function createOrder(order) {
  const c = await getCollection();
  await c.insertOne({ ...order, _id: order.orderId });
  return order;
}

export async function getOrder(orderId) {
  const c = await getCollection();
  const order = await c.findOne({ orderId }, { projection: { _id: 0 } });
  return order || null;
}

export async function getOrderByReference(reference) {
  const c = await getCollection();
  const order = await c.findOne({ reference }, { projection: { _id: 0 } });
  return order || null;
}

export async function updateOrder(orderId, updates) {
  const c = await getCollection();
  const result = await c.findOneAndUpdate(
    { orderId },
    { $set: { ...updates, updatedAt: new Date().toISOString() } },
    { returnDocument: 'after', projection: { _id: 0 } }
  );
  return result;
}

export async function getOrdersByUserId(userId) {
  const c = await getCollection();
  return c.find({ userId }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
}

export async function getAllOrders() {
  const c = await getCollection();
  return c.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
}
