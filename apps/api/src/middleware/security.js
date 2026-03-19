import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { getAllowedOrigins } from '../config/env.js';

export function createSecurityMiddleware() {
    const allowedOrigins = getAllowedOrigins();

    const corsMiddleware = cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            callback(new Error('Origin not allowed by CORS'));
        },
        credentials: true,
    });

    const limiter = rateLimit({
        windowMs: 60 * 1000,
        limit: 240,
        standardHeaders: true,
        legacyHeaders: false,
    });

    const securityHeaders = helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    });

    return {
        corsMiddleware,
        limiter,
        securityHeaders,
    };
}
