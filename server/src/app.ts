import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { ENV } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export const createApp = (): Express => {
  const app = express();

  // Security Middleware
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows flexible integration during dev
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS Middleware
  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      if (
        origin.includes('netlify.app') ||
        origin.includes('vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin === ENV.CLIENT_URL
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200,
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // Body and Cookie Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Logging
  if (ENV.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Health Check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      app: 'RoomMate Split (Alpha C-42)',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API routes
  app.use('/api', apiRoutes);

  // 404 Handler
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ success: false, message: 'API route not found.' });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};
