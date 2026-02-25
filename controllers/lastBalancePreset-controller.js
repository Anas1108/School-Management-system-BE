const LastBalancePreset = require('../models/lastBalancePresetSchema.js');

const presetCreate = async (req, res) => {
    try {
        const { name, adminID } = req.body;
        if (!name || !adminID) {
            return res.send({ message: "Preset name and admin ID are required" });
        }

        const existingPreset = await LastBalancePreset.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, school: adminID });
        if (existingPreset) {
            return res.send({ message: "A preset with this name already exists" });
        }

        const preset = new LastBalancePreset({
            name,
            school: adminID
        });

        const result = await preset.save();
        res.send(result);
    } catch (err) {
        res.status(500).json(err);
    }
};

const presetList = async (req, res) => {
    try {
        const presets = await LastBalancePreset.find({ school: req.params.id });
        if (presets.length > 0) {
            res.send(presets);
        } else {
            res.send({ message: "No presets found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const deletePreset = async (req, res) => {
    try {
        const result = await LastBalancePreset.findByIdAndDelete(req.params.id);
        res.send(result);
    } catch (error) {
        res.status(500).json(error);
    }
};

module.exports = {
    presetCreate,
    presetList,
    deletePreset
};
