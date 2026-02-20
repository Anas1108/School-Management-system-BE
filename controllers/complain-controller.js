const Complain = require('../models/complainSchema.js');

const complainCreate = async (req, res) => {
    try {
        const complain = new Complain(req.body)
        const result = await complain.save()
        res.send(result)
    } catch (err) {
        res.status(500).json(err);
    }
};

const complainList = async (req, res) => {
    try {
        let complains = await Complain.find({ school: req.params.id }).populate({
            path: 'user',
            select: 'name rollNum sclassName',
            populate: {
                path: 'sclassName',
                select: 'sclassName',
                strictPopulate: false // Allow population even if field doesn't exist on all docs (e.g. Teachers)
            }
        });
        if (complains.length > 0) {
            // Sort by date descending; if dates are equal, sort by creation time (_id)
            complains.sort((a, b) => {
                const dateDiff = new Date(b.date) - new Date(a.date);
                if (dateDiff !== 0) return dateDiff;
                return String(b._id).localeCompare(String(a._id));
            });
            res.send(complains)
        } else {
            res.send({ message: "No complains found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const complainUpdate = async (req, res) => {
    try {
        const { status, relatedAdminResponse } = req.body;
        const result = await Complain.findByIdAndUpdate(req.params.id, { status, relatedAdminResponse }, { new: true });
        res.send(result);
    } catch (err) {
        res.status(500).json(err);
    }
};

const complainListByUser = async (req, res) => {
    try {
        let complains = await Complain.find({ user: req.params.id }).populate({
            path: 'user',
            select: 'name rollNum sclassName',
            populate: {
                path: 'sclassName',
                select: 'sclassName',
                strictPopulate: false // Allow population even if field doesn't exist on all docs (e.g. Teachers)
            }
        });
        if (complains.length > 0) {
            // Sort by date descending; if dates are equal, sort by creation time (_id)
            complains.sort((a, b) => {
                const dateDiff = new Date(b.date) - new Date(a.date);
                if (dateDiff !== 0) return dateDiff;
                return String(b._id).localeCompare(String(a._id));
            });
            res.send(complains)
        } else {
            res.send({ message: "No complains found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const complainDelete = async (req, res) => {
    try {
        const result = await Complain.findByIdAndDelete(req.params.id);
        res.send(result);
    } catch (err) {
        res.status(500).json(err);
    }
};

module.exports = { complainCreate, complainList, complainUpdate, complainListByUser, complainDelete };
