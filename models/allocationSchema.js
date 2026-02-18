const mongoose = require('mongoose');

const subjectAllocationSchema = new mongoose.Schema({
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'teacher',
        required: true
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'sclass',
        required: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'subject',
        required: true
    },
    academicYear: {
        type: String,
        required: true
    },
    isClassIncharge: {
        type: Boolean,
        default: false
    },
    type: {
        type: String,
        enum: ['Primary', 'Substitute'],
        default: 'Primary'
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true
    }
}, { timestamps: true });

// Compound index to ensure unique allocation of a subject in a class for a specific year
// prevent multiple teachers from being assigned the SAME subject in the SAME class for the SAME year (unless substitute logic handles this differently, but basic conflict check is good)
subjectAllocationSchema.index({ classId: 1, subjectId: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('subjectAllocation', subjectAllocationSchema);
