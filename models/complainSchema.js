const mongoose = require('mongoose');

const complainSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'model_type',
        required: true
    },
    model_type: {
        type: String,
        required: true,
        enum: ['student', 'teacher']
    },
    date: {
        type: Date,
        required: true
    },
    complaint: {
        type: String,
        required: true
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    },
    status: {
        type: String,
        enum: ["Pending", "Done"],
        default: "Pending"
    },
    relatedAdminResponse: {
        type: String,
    }
});

module.exports = mongoose.model("complain", complainSchema);