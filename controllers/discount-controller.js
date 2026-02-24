const mongoose = require('mongoose');
const DiscountGroup = require('../models/discountGroupSchema');
const StudentDiscount = require('../models/studentDiscountSchema');
const Student = require('../models/studentSchema');

// Admin manages Discount Groups (Templates)
const createDiscountGroup = async (req, res) => {
    try {
        const existingGroup = await DiscountGroup.findOne({
            name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
            school: req.body.adminID
        });

        if (existingGroup) {
            return res.status(400).json({ message: "Discount Group with this name already exists" });
        }

        const discountGroup = new DiscountGroup({
            ...req.body,
            school: req.body.adminID
        });
        const result = await discountGroup.save();
        res.send(result);
    } catch (err) {
        res.status(500).json(err);
    }
};

const getDiscountGroups = async (req, res) => {
    try {
        const result = await DiscountGroup.find({ school: req.params.id });
        res.send(result);
    } catch (err) {
        res.status(500).json(err);
    }
};

const updateDiscountGroup = async (req, res) => {
    try {
        const result = await DiscountGroup.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.send(result);
    } catch (err) {
        res.status(500).json(err);
    }
};

const deleteDiscountGroup = async (req, res) => {
    try {
        const result = await DiscountGroup.findByIdAndDelete(req.params.id);
        res.send(result);
    } catch (err) {
        res.status(500).json(err);
    }
};

// Admin assigns discounts to a student
const assignStudentDiscount = async (req, res) => {
    try {
        const { studentId, adminID, discountGroup, customName, type, value } = req.body;

        let nameToUse = customName;
        let typeToUse = type;
        let valueToUse = value;

        if (discountGroup) {
            const group = await DiscountGroup.findById(discountGroup);
            if (group) {
                nameToUse = group.name;
                typeToUse = group.type;
                valueToUse = group.value;
            }
        }

        if (!nameToUse) {
            return res.status(400).json({ message: "Discount must have a name (either preset or custom)" });
        }

        const studentDiscount = new StudentDiscount({
            studentId,
            school: adminID,
            discountGroup: discountGroup || undefined,
            customName: discountGroup ? undefined : customName,
            type: typeToUse,
            value: valueToUse
        });

        const result = await studentDiscount.save();
        const populated = await StudentDiscount.findById(result._id).populate('discountGroup');
        res.send(populated);
    } catch (err) {
        res.status(500).json(err);
    }
};

const getStudentDiscounts = async (req, res) => {
    try {
        const studentId = req.params.id;
        const result = await StudentDiscount.find({ studentId, status: 'Active' }).populate('discountGroup');
        res.send(result);
    } catch (err) {
        res.status(500).json(err);
    }
};

const removeStudentDiscount = async (req, res) => {
    try {
        const result = await StudentDiscount.findByIdAndDelete(req.params.id);
        res.send(result);
    } catch (err) {
        res.status(500).json(err);
    }
};

module.exports = {
    createDiscountGroup,
    getDiscountGroups,
    updateDiscountGroup,
    deleteDiscountGroup,
    assignStudentDiscount,
    getStudentDiscounts,
    removeStudentDiscount
};
