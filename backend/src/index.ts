import app from './app';
import { config } from './config';
import { prisma } from './prisma/client';
import { startAnalysisWorker } from './workers/analysis.worker';
import { startCronWorker } from './workers/cron.worker';
import { pingRedis } from './workers/queue';

async function main(): Promise<void> {
  // Test DB connection
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }

  // Test Redis connection
  const redisOk = await pingRedis();
  if (!redisOk) {
    console.error('❌ Redis connection failed. Is Redis running?');
    process.exit(1);
  }
  console.log('✅ Redis connected');

  // Start background workers
  startAnalysisWorker();
  startCronWorker();

  app.listen(config.port, () => {
    console.log(`🚀 Server running on http://localhost:${config.port}`);
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`   Frontend: ${config.frontendUrl}`);
  });

  process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
