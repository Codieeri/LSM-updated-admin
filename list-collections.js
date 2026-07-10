import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/env/.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log(collections.map(c => c.name));
  process.exit(0);
}
run();
