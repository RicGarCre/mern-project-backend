const jwt = require('jsonwebtoken');
const HttpError = require("../models/http-error");


const checkAuth = (req, res, next) => {
    if (req.method == 'OPTIONS') {
        return next();
    }
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            throw new Error('Fallo de autenticación');
        }
        const decodedToken = jwt.verify(token, process.env.JWT_KEY);
        req.userData = { userID: decodedToken.userID };
        next();
    } catch (err) {
        return next(new HttpError('Fallo de autenticación', 401));
    }
};

module.exports = checkAuth;


