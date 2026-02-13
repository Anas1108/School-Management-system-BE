const mongoose = require('mongoose');

const studentInvoiceSchema = new mongoose.Schema({
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
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'sclass',
        required: true,
    },
    month: {
        type: String, // e.g., "September" or "09"
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    challanNumber: {
        type: String,
        required: true,
        unique: true
    },
    feeBreakdown: [{
        headName: String,
        amount: Number
    }],
    previousArrears: {
        type: Number,
        default: 0
    },
    lateFine: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Unpaid', 'Partial', 'Paid'],
        default: 'Unpaid'
    },
    dueDate: {
        type: Date,
        required: true
    },
    paymentDate: {
        type: Date
    }
}, { timestamps: true });

module.exports = mongoose.model("studentInvoice", studentInvoiceSchema);
