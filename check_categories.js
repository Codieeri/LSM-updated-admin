import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: 'backend/.env' });

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const jobColl = collections.find(c => c.name.toLowerCase().includes('job'))?.name || 'jobs';
    
    const jobs = await db.collection(jobColl).find({}).toArray();
    console.log(`Categories in ${jobColl}:`, [...new Set(jobs.map(j => j.category))]);
    
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}
check();
