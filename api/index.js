// Vercel Serverless Function — wraps the Express backend
let app;
try {
    app = require('../src/app');
} catch (err) {
    console.error('Failed to load app:', err);
    app = (req, res) => {
        res.status(500).json({ error: 'Server failed to initialize', detail: err.message });
    };
}

module.exports = app;
