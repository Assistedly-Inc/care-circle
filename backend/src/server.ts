import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env';
import routes from './routes';
import { errorHandler } from './utils/errorHandler';
import { scheduleReminders } from './services/reminderService';
import { webhookRouter } from './api/checkout';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
// Stripe webhook MUST see the raw body for signature verification — register
// before the global express.json() parser.
app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRouter);
app.use(express.json());
app.use(morgan('combined'));

// API routes
app.use('/api', routes);

// Global error handler
app.use(errorHandler);

// Start reminder scheduler only in non‑test environments
if (process.env.NODE_ENV !== 'test') {
  scheduleReminders();
}

if (require.main === module) {
  const PORT = config.port;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
  });
}

export { app };
