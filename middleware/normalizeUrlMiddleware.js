// Strips accidental newline or carriage-return encodings from the URL
module.exports = (req, res, next) => {
    if (typeof req.url === 'string') {
        req.url = req.url.replace(/%0A|%0D/g, '');
    }
    next();
};

