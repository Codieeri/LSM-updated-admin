import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: 'backend/.env' });

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const resumeAsset = await db.collection('resumeAsset').findOne({});
    
    if (resumeAsset && resumeAsset.data) {
      const buffer = resumeAsset.data.buffer ? Buffer.from(resumeAsset.data.buffer) : Buffer.from(resumeAsset.data);
      console.log('Buffer successfully created! Length:', buffer.length);
    }
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}
check();
