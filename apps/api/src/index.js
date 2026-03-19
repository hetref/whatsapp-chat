import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import { prisma } from '@repo/db';
import { env } from './config/env.js';
import { createSecurityMiddleware } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import flowEndpointRouter from './routes/flow-endpoint.routes.js';
import razorpayWebhookRouter from './routes/razorpay-webhook.routes.js';
import wachatRouter from './routes/wachat.routes.js';

const app = express();
const { corsMiddleware, limiter, securityHeaders } = createSecurityMiddleware();
const port = env.apiPort;

if (env.trustProxy) {
    app.set('trust proxy', 1);
}

// Always return fresh payloads for API routes (no ETag/304 behavior).
app.set('etag', false);

app.disable('x-powered-by');
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(limiter);
app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Razorpay signature verification requires the untouched raw body.
app.use('/api/razorpay/webhook', express.raw({ type: 'application/json' }), razorpayWebhookRouter);
app.use(express.json({ limit: '2mb' }));

app.use('/api/flow-endpoint', flowEndpointRouter);
app.use('/api', wachatRouter);

app.get('/health', (_req, res) => {
    res.json({
        ok: true,
        service: 'api',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

app.get('/db/health', async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ ok: true, db: 'connected' });
    } catch (error) {
        res.status(500).json({
            ok: false,
            db: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
});
