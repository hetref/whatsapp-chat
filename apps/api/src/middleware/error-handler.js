export function notFoundHandler(req, res) {
    res.status(404).json({
        ok: false,
        error: 'Not found',
        path: req.originalUrl,
    });
}

export function errorHandler(error, _req, res, _next) {
    console.error('API Error:', error);

    let parsedDetails = error?.details;
    let message = error?.message || 'Request failed';

    // If message is a serialized JSON error from Meta or another service, unwrap it
    if (typeof message === 'string' && (message.startsWith('{') || message.includes('"error":'))) {
        try {
            const parsed = JSON.parse(message);
            if (parsed.error?.message) {
                message = parsed.error.message;
                parsedDetails = parsed.error;
            }
        } catch {
            // Keep message as-is
        }
    }

    const statusCode = Number.isInteger(error?.statusCode) && error.statusCode >= 400 && error.statusCode < 600
        ? error.statusCode
        : 400;

    res.status(statusCode).json({
        ok: false,
        error: message,
        message: message,
        details: parsedDetails,
    });
}

