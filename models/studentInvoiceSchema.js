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
        type: Number,
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
        amount: { type: Number, min: 0 }
    }],
    previousArrears: {
        type: Number,
        default: 0,
        min: 0
    },
    lateFine: {
        type: Number,
        default: 0,
        min: 0
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    paidAmount: {
        type: Number,
        default: 0,
        min: 0
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
