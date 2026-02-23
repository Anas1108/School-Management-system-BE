const mongoose = require('mongoose');

const discountGroupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
    },
    type: {
        type: String,
        enum: ['Percentage', 'FixedAmount'],
        required: true,
    },
    value: {
        type: Number,
        required: true,
        min: 0
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    }
}, { timestamps: true });

module.exports = mongoose.model("discountGroup", discountGroupSchema);
