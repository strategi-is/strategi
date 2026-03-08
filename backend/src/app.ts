import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter, authLimiter, analysisLimiter } from './middleware/rateLimiter';

import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import analysisRoutes from './routes/analysis.routes';
import adminRoutes from './routes/admin.routes';
import cmsRoutes from './routes/cms.routes';
import billingRoutes from './routes/billing.routes';
import { billingController } from './controllers/billing.controller';

const app = express();

// ─── TRUST PROXY ─────────────────────────────────────────────────────────────
// Required on Railway/Heroku/etc so rate limiters see real client IPs via X-Forwarded-For
app.set('trust proxy', 1);

// ─── SECURITY HEADERS ────────────────────────────────────────────────────────
// helmet sets X-Content-Type-Options, X-Frame-Options, HSTS, CSP, etc.
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Only allow requests from the configured frontend origin
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ─── LOGGING ─────────────────────────────────────────────────────────────────
app.use(morgan(config.isDev ? 'dev' : 'combined'));

// ─── STRIPE WEBHOOK ──────────────────────────────────────────────────────────
// Must be registered BEFORE express.json() — Stripe signature verification
// requires the raw request body, not a parsed object.
app.post(
  '/api/billing/webhook',
  express.raw({ type: 'application/json' }),
  billingController.webhook,
);

// ─── BODY PARSING ────────────────────────────────────────────────────────────
// 500kb is generous for JSON APIs; prevents large-payload DoS attacks
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));
app.use(cookieParser());

// ─── RATE LIMITING ───────────────────────────────────────────────────────────
// Apply a general limiter to all /api routes (200 req / 15 min / IP)
app.use('/api', generalLimiter);

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────
// Excluded from rate limiting intentionally (used by load balancers / uptime monitors)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── ROUTES ──────────────────────────────────────────────────────────────────
// Auth endpoints get a stricter limiter (10 req / 15 min / IP) — brute-force protection
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth', authRoutes);

app.use('/api/companies', companyRoutes);

// Analysis start is expensive (triggers LLM + scraping pipeline): 5 / hour / IP
// Scope to POST only — GET polling must not count against this limit
app.post('/api/analyses/companies/:companyId/start', analysisLimiter);
app.use('/api/analyses', analysisRoutes);

app.use('/api/admin', adminRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/billing', billingRoutes);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── ERROR HANDLER ───────────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
