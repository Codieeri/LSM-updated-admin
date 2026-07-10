import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import adminRoutes from './routes/admin.js';
import publicRoutes from './routes/public.js';

// Load environment variables
dotenv.config();

const app = express();

// Standard Middlewares
const allowedOrigins = [
  'http://localhost:5173', // Public hiring frontend (Updated-lsm)
  'http://localhost:3000', // Admin client panel
  'http://localhost:3001', // Backend itself (for curl tests)
  'http://localsm.tech',
  'https://localsm.tech',
  'https://admin.localsm.tech',
  'https://www.admin.localsm.tech',
  'https://final-v4-admin.vercel.app',
  'https://lsm-updated-admin-ngnr.vercel.app/login',
  'https://localsmhiring.vercel.app',
  'https://final-v4-admin.vercel.app',
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

// Register Routes
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Employee Management Backend API is running' });
});

// 404 Route
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start standalone server if not running on Vercel
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;

  const startServer = async () => {
    try {
      await connectDB();
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  };

  startServer();
}

export default app;
