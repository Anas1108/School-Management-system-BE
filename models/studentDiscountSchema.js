const mongoose = require('mongoose');

const studentDiscountSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'student',
        required: true,
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    },
    discountGroup: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'discountGroup', // Optional, if null, it's a custom ad-hoc discount
    },
    customName: {
        type: String, // E.g. "Special Principal Discount"
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
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    }
}, { timestamps: true });

module.exports = mongoose.model("studentDiscount", studentDiscountSchema);
