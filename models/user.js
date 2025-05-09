const mongoose = require('mongoose');
//const uniqueValidator = require('mongoose-unique-validator');

const userModel = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true},
    password: { type: String, required: true, minlength: 8 },
    avatar: { type: String, required: true },
    places: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Place'}]
});

//userModel.plugin(uniqueValidator);

module.exports = mongoose.model('User', userModel);