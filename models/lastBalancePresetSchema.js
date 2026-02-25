const mongoose = require("mongoose");

const lastBalancePresetSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    }
});

module.exports = mongoose.model("lastBalancePreset", lastBalancePresetSchema);
