export const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    apiPort: Number(process.env.API_PORT || 4000),
    webOrigin: process.env.WEB_ORIGIN || 'http://localhost:3000',
    apiAllowedOrigins: (process.env.API_ALLOWED_ORIGINS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    trustProxy: process.env.API_TRUST_PROXY === 'true',
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
};

export function getAllowedOrigins() {
    const defaults = [env.webOrigin, 'http://localhost:3000', 'http://localhost:3001'];
    return Array.from(new Set([...defaults, ...env.apiAllowedOrigins]));
}
