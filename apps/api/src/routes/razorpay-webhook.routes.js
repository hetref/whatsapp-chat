import { Router } from 'express';
import { processRazorpayWebhook } from '../services/razorpay-webhook.service.js';

const router = Router();

router.post('/', async (req, res, next) => {
    try {
        const signature = req.get('x-razorpay-signature');
        if (!signature) {
            res.status(400).json({ ok: false, error: 'Missing x-razorpay-signature header' });
            return;
        }

        const result = await processRazorpayWebhook(req.body, signature);
        res.json({ ok: true, ...result });
    } catch (error) {
        next(error);
    }
});

export default router;
