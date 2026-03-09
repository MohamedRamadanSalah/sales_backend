const i18nMiddleware = (req, res, next) => {
    // Default to 'ar' if no language is specified.
    // The Mobile App or Web site should send 'Accept-Language: en' or 'Accept-Language: ar'
    let lang = req.headers['accept-language'] || 'ar';

    // Clean it up (sometimes browsers send 'en-US,en;q=0.9')
    if (lang.startsWith('en')) {
        lang = 'en';
    } else {
        lang = 'ar';
    }

    // Attach to request so controllers know what to return
    req.language = lang;

    next();
};

module.exports = i18nMiddleware;
