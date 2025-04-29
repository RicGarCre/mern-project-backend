const axios = require('axios');
const HttpError = require('../models/http-error');

const API_KEY = 'AIzaSyBM4JasoNe1ElxoPtuDmQUAjP_pNoN8r5Q';

async function getCoordsByAddress (address) {
    const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            address
        )}&key=${process.env.GOOGLE_API_KEY}`);

    const data = response.data;
    if (!data || data.status === 'ZERO_RESULTS') {
        const error = new HttpError('No se pudo encontrar las coordenadas de la dirección', 422);
        throw error;
    };
    const coordinates = data.results[0].geometry.location;
    return coordinates;
};

module.exports = getCoordsByAddress;