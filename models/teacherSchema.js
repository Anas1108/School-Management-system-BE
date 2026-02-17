const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const teacherSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        default: "Teacher"
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    },
    teachSubject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'subject',
    },
    teachSclass: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'sclass',
    },
    // New Fields
    employeeId: {
        type: String,
        unique: true,
    },
    phone: {
        type: String,
        required: true,
    },
    cnic: {
        type: String,
        required: true,
    },
    qualification: {
        type: String,
        required: true,
    },
    designation: {
        type: String,
        required: true,
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'department', // References the new Department model
    },
    joiningDate: {
        type: Date,
        required: true,
    },
    salary: {
        type: Number,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    subjectSpecialization: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'subject',
    }],
    policeVerification: {
        type: String,
        enum: ['Yes', 'No', 'Pending'],
        default: 'No',
    },
    serviceBookNumber: {
        type: String,
    },
    attendance: [{
        date: {
            type: Date,
            required: true
        },
        presentCount: {
            type: String,
        },
        absentCount: {
            type: String,
        }
    }]
}, { timestamps: true });

// Pre-save hook for Employee ID Generation and Password Hashing
teacherSchema.pre("save", async function (next) {
    const teacher = this;

    // Password Hashing
    if (teacher.isModified("password")) {
        const salt = await bcrypt.genSalt(10);
        teacher.password = await bcrypt.hash(teacher.password, salt);
    }

    // Employee ID Generation
    if (!teacher.employeeId) {
        const date = new Date();
        const year = date.getFullYear();
        // Check for the latest teacher to generate the next ID
        // Note: This might race condition in high concurrency but sufficient for this app
        const lastTeacher = await mongoose.model("teacher").findOne().sort({ createdAt: -1 });
        let nextSequence = "001";

        if (lastTeacher && lastTeacher.employeeId) {
            const lastIdParts = lastTeacher.employeeId.split("-");
            if (lastIdParts.length === 3 && lastIdParts[1] === year.toString()) {
                const lastSequence = parseInt(lastIdParts[2]);
                nextSequence = (lastSequence + 1).toString().padStart(3, "0");
            }
        }
        teacher.employeeId = `TEA-${year}-${nextSequence}`;
    }
    next();
});

module.exports = mongoose.model("teacher", teacherSchema);