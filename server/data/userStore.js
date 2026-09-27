import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);
let col;

async function getCollection() {
  if (!col) {
    await client.connect();
    col = client.db('breadwrapz').collection('users');
    await col.createIndex({ email: 1 }, { unique: true });
  }
  return col;
}

export async function createUser(user) {
  const c = await getCollection();
  await c.insertOne({ ...user, _id: user.userId });
  return user;
}

export async function getUserByEmail(email) {
  const c = await getCollection();
  return c.findOne({ email: email.toLowerCase() }, { projection: { _id: 0, password: 0 } });
}

export async function getUserByVerificationToken(token) {
  const c = await getCollection();
  return c.findOne({ verificationToken: token }, { projection: { _id: 0, password: 0 } });
}

export async function getUserByEmailWithPassword(email) {
  const c = await getCollection();
  return c.findOne({ email: email.toLowerCase() });
}

export async function getUserById(userId) {
  const c = await getCollection();
  return c.findOne({ userId }, { projection: { _id: 0, password: 0 } });
}

export async function updateUser(userId, updates) {
  const c = await getCollection();
  const result = await c.findOneAndUpdate(
    { userId },
    { $set: { ...updates, updatedAt: new Date().toISOString() } },
    { returnDocument: 'after', projection: { _id: 0, password: 0 } }
  );
  return result.value;
}
