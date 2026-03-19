export function notFoundHandler(req, res) {
    res.status(404).json({
        ok: false,
        error: 'Not found',
        path: req.originalUrl,
    });
}

export function errorHandler(error, _req, res, _next) {
    console.error('Unhandled API error:', error);

    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    const message = statusCode >= 500 ? 'Internal server error' : error.message || 'Request failed';

    res.status(statusCode).json({
        ok: false,
        error: message,
    });
}
