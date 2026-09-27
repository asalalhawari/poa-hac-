/**
 * ============================================================================
 * EXPRESS APPLICATION ENTRYPOINT
 * ============================================================================
 * Configures middleware, security, routes, and global error handling.
 */

import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { hacRouter } from './routes/hacRoutes.js';

export const app = express();

// Security & Parsing Middleware
app.use(cors());
app.use(express.json());

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();
  next();
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[HTTP] ${req.method} ${req.originalUrl} - ${duration}ms`);
  }
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'poa-hac-backend-service',
    timestamp: new Date().toISOString(),
  });
});

// Mount HAC Signal Investigation Router
app.use('/api/hac', hacRouter);

// 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Resource not found at ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[UNHANDLED_EXCEPTION]', err);
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected server error occurred.',
    details: err?.message || 'Unknown error',
  });
});
