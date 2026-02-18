const mongoose = require('mongoose');

const feeStructureSchema = new mongoose.Schema({
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'sclass',
        required: true,
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    },
    feeHeads: [{
        headId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'feeHead',
            required: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        }
    }],
    lateFee: {
        type: Number,
        default: 0,
        min: 0
    },
    dueDay: {
        type: Number,
        min: 1,
        max: 31,
        required: true,
        default: 10 // Default to 10th of the month
    }
}, { timestamps: true });

module.exports = mongoose.model("feeStructure", feeStructureSchema);
