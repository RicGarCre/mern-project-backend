const fs = require('fs');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const Place = require('../models/place');
const User = require('../models/user');
const getCoordsByAddress = require('../util/location');


const getPlaceByID = async (req, res, next) => {
    const placeID = req.params.pid;
    let place;
    try {
        place = await Place.findById(placeID);
    } catch (err) {
        return next(new HttpError('No existe lugar con ese ID', 500));
    }
    if (!place) {
        return next(new HttpError('No se encuentra ningún lugar con el ID especificado', 404));
    }
    res
        .status(200)
        .json({
            place: place.toObject({getters: true})
        });
}
/*
const getPlacesByUserID = async (req, res, next) => {
    const userID = req.params.uid;
    let places;
    try {
        places = await Place.find({ creator: userID});
    } catch (err) {
        return next(new HttpError('No se encuentra ningún usuario con el ID especificado', 500));
    }
    if (!places || places.length === 0) {
        return next(new HttpError('No existe ningún lugar publicado por usuario', 404));
    }
    res
        .status(200)
        .json({
            places: places.map(p => p.toObject({getters: true}))
        });  
}
*/
// Dos formas de hacer lo mismo.

const getPlacesByUserID = async (req, res, next) => {
    const userID = req.params.uid;
    let userWithPlaces;
    try {
        userWithPlaces = await User.findById(userID).populate('places');
    } catch (err) {
        return next(new HttpError('No se encuentra ningún usuario con el ID especificado', 500));
    }
    if (!userWithPlaces || userWithPlaces.places.length === 0) {
        return next(new HttpError('No existe ningún lugar publicado por usuario', 404));
    }
    res
        .status(200)
        .json({
            places: userWithPlaces.places.map(p => p.toObject({getters: true}))
        });  
}

const createPlace = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Error creando Place. Entradas no válidas', 422));
    };
    const { title, description, address } = req.body;
    let coordinates;
    try {
        coordinates = await getCoordsByAddress(address);
    } catch (err) {
        return next(err);
    }
    const createdPlace = new Place({
        title,
        description,
        address,
        coordinates,
        image: req.file.path,
        creator: req.userData.userID
    });

    let user;
    try {
        user = await User.findById(req.userData.userID);
    } catch {
        return next(new HttpError('Error creando nuevo lugar 1', 500));
    }
    if (!user) {
        return next(new HttpError('El usuario no existe', 404));
    };

    try {
        const session = await mongoose.startSession();
        session.startTransaction();

        await createdPlace.save({ session: session });
        user.places.push(createdPlace);
        await user.save({ session: session });

        await session.commitTransaction();
    } catch (err) {
        console.log(err);
        return next(new HttpError('Error creando nuevo lugar 2', 500));
    }
    res
        .status(201)
        .json({
            place: createdPlace
        });
};

const updatePlace = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new HttpError('Error actualizando Place. Entradas no válidas', 422);
    };
    const placeID = req.params.pid;
    const { title, description } = req.body;
    let place;
    try {
        place = await Place.findById(placeID);
    } catch (err) {
        return next(new HttpError('No existe lugar con ese ID', 500));
    }
    if (!place) {
        return next(new HttpError('No se encuentra ningún lugar con el ID especificado', 404));
    }
    
    if (place.creator.toString() !== req.userData.userID) {
        return next(new HttpError('El usuario actual no tiene acceso para editar el lugar', 401));
    }

    place.title = title;
    place.description = description;
    try {
        await place.save();
    } catch (err) {
        return next(new HttpError('No pudo actualizarse el lugar', 500));
    }
    res
        .status(200)
        .json({
            place: place.toObject({getters: true})
        })
};


const deletePlace = async (req, res, next) => {
    const placeID = req.params.pid;
    let place;
    try {
        place = await Place.findById(placeID).populate('creator');
    } catch (err) {
        return next(new HttpError('No se puede acceder al lugar', 500));
    }

    if (!place) {
        return next(new HttpError('No existe lugar con ese ID', 404));
    }

    if (place.creator.id !== req.userData.userID) {
        return next(new HttpError('El usuario actual no tiene acceso para eliminar el lugar', 401));
    }

    const imagePath = place.image;
    try {
        const session = await mongoose.startSession();
        session.startTransaction();

        await Place.deleteOne({_id: placeID}, {session: session});
        place.creator.places.pull(placeID);
        await place.creator.save({ session: session })

        await session.commitTransaction();
    } catch (err) {
        return next(new HttpError('No se puede eliminar el lugar', 500));
    }
    fs.unlink(imagePath, err => {
        console.log(err);
    });

    res
        .status(200)
        .json({
            message: 'Lugar eliminado'
        });
};

exports.getPlaceByID = getPlaceByID;
exports.getPlacesByUserID = getPlacesByUserID;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
