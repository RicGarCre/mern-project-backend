const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');
const User = require('../models/user')


const getUsers = async (req, res, next) => {
    let users;
    try {
        users = await User.find({}, '-password');
    } catch (err) {
        return next(new HttpError('Error obteniendo usuarios', 404));
    }
    if (!users || users.length === 0) {
        return next(new HttpError('No existen ususarios todavía', 404));
    }

    res
        .status(200)
        .json({users: users.map(u => u.toObject({getters: true}))});
};

const signUp = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Error de registro de usuario. Entradas no válidas', 402));
    };
    
    const { name, email, password } = req.body;
    let existUser;
    try {
        existUser = await User.findOne({ email: email });
    } catch (err) {
        return next(new HttpError('Error de registro', 500));
    }
    if (existUser) {
        return next(new HttpError('Existe un usuario registrado con este email', 422));
    }

    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12);
    } catch (err) {
        return next(new HttpError('No se pudo encriptar la contraseña del usuario', 500));
    }
    const newUser = new User({
        name,
        email,
        password: hashedPassword,
        avatar: req.file.path,
        places: [] 
    });

    try {
        await newUser.save();
    } catch (err) {
        return next(new HttpError('No se puedo registrar el usuario', 500));
    }

    let token;
    try {
        token = jwt.sign(
            { userID: newUser.id, email: newUser.email },
            process.env.JWT_KEY,
            { expiresIn: '1h'}
        );
    } catch (err) {
        return next(new HttpError('No se puede registrar el nuevo usuario', 500));
    }

    res.status(201).json({
        userID: newUser.id,
        email: newUser.email,
        token: token
    });
};

const logIn = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Error de login. Entradas no válidas', 402));
    };

    const { email, password } = req.body;
    let existUser;
    try {
        existUser = await User.findOne({ email: email});
    } catch (err) {
        return next(new HttpError('Error de login', 401));
    }

    if (!existUser) {
        return next(new HttpError('Error de autenticación. Credenciales incorrectos.', 401));
    };

    let isValidPassword = false;
    try {
        isValidPassword = await bcrypt.compare(password, existUser.password);
    } catch (err) {
        return next(new HttpError('Error validando la contraseña', 500));
    }
    if (!isValidPassword) {
        return next(new HttpError('Error de autenticación. Credenciales incorrectos.', 401));
    }

    let token;
    try {
        token = jwt.sign(
            { userID: existUser.id, email: existUser.email },
            process.env.JWT_KEY,
            { expiresIn: '1h'}
        );
    } catch (err) {
        return next(new HttpError('No se puede loggear el usuario', 500));
    }

    res.status(200).json({
        userID: existUser.id,
        email: existUser.email,
        token: token
    });
};


exports.getUsers = getUsers;
exports.signUp = signUp;
exports.logIn = logIn;
