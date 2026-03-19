import { Router } from 'express';

const router = Router();

router.post('/', async (req, res) => {
    try {
        const body = req.body || {};
        const { screen_id, data = {}, flow_token, flow_cta } = body;

        console.log('Flow payload received', {
            screen_id,
            flow_token: flow_token ? 'present' : 'missing',
            flow_cta: flow_cta || null,
        });

        if (screen_id === 'SIGN_IN') {
            const { email, password } = data;

            if (email === 'test@example.com' && password === 'password123') {
                res.json({
                    version: '7.2',
                    screen: 'SIGN_IN',
                    data: { status_message: 'Sign in successful! Redirecting...' },
                    action: {
                        name: 'navigate',
                        next_screen: 'SUCCESS_SCREEN',
                    },
                });
                return;
            }

            res.json({
                version: '7.2',
                screen: 'SIGN_IN',
                data: { email_error: 'Invalid email or password.' },
            });
            return;
        }

        if (screen_id === 'SIGN_UP') {
            const { password, confirm_password } = data;

            if (password !== confirm_password) {
                res.json({
                    version: '7.2',
                    screen: 'SIGN_UP',
                    data: { password_error: 'Passwords do not match.' },
                });
                return;
            }

            res.json({
                version: '7.2',
                screen: 'SIGN_UP',
                data: { status_message: 'Sign up successful! Please check your email.' },
            });
            return;
        }

        res.json({
            version: '7.2',
            screen: screen_id,
            data: { status_message: 'Thank you for your submission!' },
        });
    } catch (error) {
        console.error('Flow endpoint error:', error);
        res.status(500).json({
            version: '7.2',
            screen: 'SIGN_IN',
            data: { error_message: 'An unexpected error occurred. Please try again later.' },
        });
    }
});

export default router;
