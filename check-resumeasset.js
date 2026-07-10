import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/env/.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  const resumeAssets = await db.collection('resumeAsset').find({}).limit(5).toArray();
  console.log("=== ResumeAssets ===");
  console.log(JSON.stringify(resumeAssets, null, 2));

  const applications = await db.collection('applications').find({}).limit(5).toArray();
  console.log("=== Applications ===");
  console.log(JSON.stringify(applications, null, 2));
  
  process.exit(0);
}
run();
