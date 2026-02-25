const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    rollNum: {
        type: Number,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    sclassName: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'sclass',
        required: true,
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    },
    role: {
        type: String,
        default: "Student"
    },
    // Dynamically added balances (e.g., Books, Uniform)
    lastBalances: [{
        feeName: { type: String, required: true },
        amount: { type: Number, required: true, default: 0 }
    }],
    // New Fields for Family/Guardian Module
    dateOfBirth: {
        type: Date,
        required: true
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: true
    },
    studentBForm: {
        type: String,
        required: true,
        unique: true
    },
    admissionDate: {
        type: Date,
        default: Date.now
    },
    religion: {
        type: String,
        enum: ['Muslim', 'Non-Muslim'],
        required: true
    },
    bloodGroup: {
        type: String,
    },
    familyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'family',
        required: true
    },
    examResult: [
        {
            subName: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'subject',
            },
            marksObtained: {
                type: Number,
                default: 0
            }
        }
    ],
    sessionYear: {
        type: String,
        default: ""
    }
});

module.exports = mongoose.model("student", studentSchema);