import app from '../backend/src/app.js';
import connectDB from '../backend/src/config/db.js';

let isConnected = false;

const handler = async (req, res) => {
  // Only connect to DB if not already connected
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.error('Failed to connect to database in serverless function:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }
  }

  // Delegate request to Express app
  return app(req, res);
};

export default handler;
