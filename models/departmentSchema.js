const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema({
    departmentName: {
        type: String,
        required: true,
        unique: true,
    },
    items: [{
        type: String, // Just in case they want to track items or resources later
    }]
});

module.exports = mongoose.model("department", departmentSchema);
