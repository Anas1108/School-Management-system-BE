const mongoose = require("mongoose");

const sclassSchema = new mongoose.Schema({
    sclassName: {
        type: String,
        required: true,
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin'
    },
    classTeacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'teacher'
    },
}, { timestamps: true });

module.exports = mongoose.model("sclass", sclassSchema);

