import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './env.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { companiesRouter } from './routes/companies.js';
import { drugsRouter } from './routes/drugs.js';
import { purchasesRouter } from './routes/purchases.js';
import { salesRouter } from './routes/sales.js';
import { messagesRouter } from './routes/messages.js';
import { dashboardRouter } from './routes/dashboard.js';
import { reportsRouter } from './routes/reports.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');

  // Trust the reverse proxy (Railway, Render, etc.) for correct
  // client-IP reporting and HTTPS detection behind the proxy.
  if (env.TRUST_PROXY) {
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  }

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/companies', companiesRouter);
  app.use('/api/drugs', drugsRouter);
  app.use('/api/purchases', purchasesRouter);
  app.use('/api/sales', salesRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/reports', reportsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
