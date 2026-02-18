const mongoose = require('mongoose');

const feeHeadSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    }
}, { timestamps: true });

module.exports = mongoose.model("feeHead", feeHeadSchema);
