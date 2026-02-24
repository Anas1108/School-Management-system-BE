const mongoose = require('mongoose');

const familySchema = new mongoose.Schema({
    familyName: {
        type: String,
        required: true
    },
    fatherName: {
        type: String,
        required: true
    },
    fatherCNIC: {
        type: String,
    },
    fatherPhone: {
        type: String,
        required: true
    },
    fatherOccupation: {
        type: String,
    },
    motherName: {
        type: String,
    },
    motherPhone: {
        type: String,
    },
    homeAddress: {
        type: String,
        required: true
    },
    guardianEmail: {
        type: String,
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    },
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'student'
    }]
}, { timestamps: true });

module.exports = mongoose.model("family", familySchema);
