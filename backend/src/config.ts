import dotenv from 'dotenv';
dotenv.config();

// Throws at startup if a required env var is missing — fail fast, never silently
function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

// Warns in dev if an API key is missing; throws in production
function apiKey(key: string): string {
  const val = process.env[key] || '';
  if (!val && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required API key: ${key}`);
  }
  if (!val) {
    console.warn(`[config] WARNING: ${key} is not set — related features will fail`);
  }
  return val;
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  db: {
    url: required('DATABASE_URL'),
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  auth: {
    // JWT_SECRET and ENCRYPTION_KEY are always required — no insecure fallbacks
    jwtSecret: required('JWT_SECRET'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    encryptionKey: required('ENCRYPTION_KEY'),
  },

  olostep: {
    apiKey: apiKey('OLOSTEP_API_KEY'),
    baseUrl: process.env.OLOSTEP_BASE_URL || 'https://agent.olostep.com/olostep-p2p-infer',
    costAlertThreshold: parseInt(process.env.OLOSTEP_COST_ALERT_THRESHOLD || '300', 10),
  },

  llm: {
    anthropicKey: apiKey('ANTHROPIC_API_KEY'),
    openaiKey: apiKey('OPENAI_API_KEY'),
    geminiKey: process.env.GEMINI_API_KEY || '', // optional
    perplexityKey: apiKey('PERPLEXITY_API_KEY'),
  },

  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'noreply@strategi.ai',
    alertEmail: process.env.ALERT_EMAIL || '',
  },

  stripe: {
    secretKey: apiKey('STRIPE_SECRET_KEY'),
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    priceId: process.env.STRIPE_PRICE_ID || '', // Stripe Price ID for the Pro plan
  },
};
