const mongoose = require('mongoose');
const FeeHead = require('../models/feeHeadSchema');
const FeeStructure = require('../models/feeStructureSchema');
const StudentInvoice = require('../models/studentInvoiceSchema');
const Student = require('../models/studentSchema');
const Sclass = require('../models/sclassSchema');

// Fee Head Management
const createFeeHead = async (req, res) => {
    try {
        const feeHead = new FeeHead({
            ...req.body,
            school: req.body.adminID
        });
        const result = await feeHead.save();
        res.send(result);
    } catch (err) {
        res.status(500).json(err);
    }
};

const getFeeHeads = async (req, res) => {
    try {
        const result = await FeeHead.find({ school: req.params.id });
        res.send(result);
    } catch (err) {
        res.status(500).json(err);
    }
};

// Fee Structure Management
const createFeeStructure = async (req, res) => {
    try {
        const existing = await FeeStructure.findOne({ classId: req.body.classId, school: req.body.adminID });
        if (existing) {
            const result = await FeeStructure.findByIdAndUpdate(existing._id, req.body, { new: true });
            res.send(result);
        } else {
            const feeStructure = new FeeStructure({
                ...req.body,
                school: req.body.adminID
            });
            const result = await feeStructure.save();
            res.send(result);
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const getFeeStructure = async (req, res) => {
    try {
        const result = await FeeStructure.findOne({ classId: req.params.id }).populate('feeHeads.headId');
        res.send(result);
    } catch (err) {
        res.status(500).json(err);
    }
};

// specialized logic 
const generateInvoices = async (req, res) => {
    const { classId, month, year, adminID } = req.body;

    try {
        const students = await Student.find({ sclassName: classId, school: adminID });
        const feeStructure = await FeeStructure.findOne({ classId: classId }).populate('feeHeads.headId');


        if (!feeStructure) {
            console.log(`Fee structure not found for classId: ${classId} and adminID: ${adminID}`);
            return res.status(400).json({ message: "Fee structure not defined for this class" });
        }

        const invoices = [];

        for (const student of students) {
            // Check if invoice already exists
            const existing = await StudentInvoice.findOne({
                studentId: student._id,
                month,
                year
            });

            if (existing) continue;

            // Calculate previous arrears
            const previousInvoices = await StudentInvoice.find({ studentId: student._id });
            let balance = 0;
            previousInvoices.forEach(inv => {
                balance += (inv.totalAmount + inv.lateFine) - inv.paidAmount;
            });

            let previousArrears = 0;
            let credit = 0;

            if (balance > 0) previousArrears = balance;
            else credit = Math.abs(balance);

            // Calculate Current Fee
            let currentFee = 0;
            // The previous feeBreakdown map was not used, removing it.
            // Populate names efficiently or refetch structure with populate
            // Note: Efficient way would be to populate once outside loop.
            // But logic was: const populatedStructure = await FeeStructure.findById(feeStructure._id).populate('feeHeads.headId');

            // Re-fetching inside loop is bad for performance but let's stick to logic for now. 
            // Better: Populate feeStructure at the top.

            const detailedBreakdown = feeStructure.feeHeads.map(head => {
                currentFee += head.amount;
                return {
                    headName: head.headId.name, // Will function if we populate at top
                    amount: head.amount
                };
            });

            const totalAmount = currentFee + previousArrears - credit;

            // Challan Number: SCH-YYYY-MM-ID
            // need padded ID or just part of it. Using last 6 chars of ID for uniqueness
            const studIdStr = student._id.toString();
            const uniqueSuffix = studIdStr.substring(studIdStr.length - 6);
            const challanNumber = `SCH-${year}-${month}-${uniqueSuffix}`.toUpperCase();

            // Calculate specific due date
            const dueDay = feeStructure.dueDay || 10;
            // Handle if due day > days in month (e.g. Feb 30) -> set to last day
            const daysInMonth = new Date(year, month, 0).getDate();
            const actualDueDay = Math.min(dueDay, daysInMonth);
            const dueDate = new Date(year, month - 1, actualDueDay);

            const invoice = new StudentInvoice({
                studentId: student._id,
                school: adminID,
                classId: classId,
                month,
                year,
                challanNumber,
                feeBreakdown: detailedBreakdown,
                previousArrears,
                totalAmount: totalAmount > 0 ? totalAmount : 0, // Should not be negative
                dueDate,
                status: totalAmount <= 0 ? 'Paid' : 'Unpaid' // If covered by credit
            });

            invoices.push(invoice);
        }

        if (invoices.length > 0) {
            await StudentInvoice.insertMany(invoices);
            res.send({ message: `Generated ${invoices.length} invoices` });
        } else {
            res.send({ message: "No new invoices generated (all students might already have one)" });
        }

    } catch (err) {
        console.error("Error in generateInvoices:", err);
        res.status(500).json(err);
    }
};

const getInvoices = async (req, res) => {
    try {
        const { month, year } = req.query;
        let query = { classId: req.params.id };
        if (month && year) {
            query.month = month;
            query.year = year;
        }

        const invoices = await StudentInvoice.find(query)
            .populate('studentId', 'name rollNum')
            .sort({ createdAt: -1 });
        res.send(invoices);
    } catch (err) {
        console.error("Error in getInvoices:", err);
        res.status(500).json(err);
    }
};

const payInvoice = async (req, res) => {
    const { amount, date } = req.body;
    try {
        const invoice = await StudentInvoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });

        // Check for late fee
        const paymentDate = new Date(date);
        const dueDate = new Date(invoice.dueDate);

        let lateFineToAdd = 0;
        if (paymentDate > dueDate && invoice.lateFine === 0) {
            // Fetch class fee structure to get late fee amount
            const feeStructure = await FeeStructure.findOne({ classId: invoice.classId });
            lateFineToAdd = feeStructure ? feeStructure.lateFee : 0;
        }

        invoice.lateFine = lateFineToAdd;
        invoice.paidAmount += parseInt(amount);
        invoice.paymentDate = date;

        const totalDue = invoice.totalAmount + invoice.lateFine;

        if (invoice.paidAmount >= totalDue) {
            invoice.status = 'Paid';
        } else if (invoice.paidAmount > 0) {
            invoice.status = 'Partial';
        }

        const result = await invoice.save();
        res.send(result);

    } catch (err) {
        res.status(500).json(err);
    }
};

// Dashboard Stats
const getFeeStats = async (req, res) => {
    const { month, year } = req.query;
    const schoolId = req.params.id;
    try {
        const invoices = await StudentInvoice.find({ school: schoolId }); // Maybe filter by month/year if strictly monthly stats needed
        // Requirement: "Monthly Expected Revenue vs Collected Revenue"
        // I should probably filter by the specific month if passed, otherwise all time?
        // Let's support an optional filter or default to current month.
        // For now, let's aggregate everything for the "Total" stats and maybe separate monthly.

        // Actually, let's stick to the requested View: "Monthly Expected..."
        // So we need to match month/year.

        // If not provided, use current?
        // Let's assume frontend passes them.

        if (!mongoose.Types.ObjectId.isValid(schoolId)) {
            return res.send({ totalExpected: 0, totalCollected: 0, totalLateFines: 0 });
        }

        let match = { school: new mongoose.Types.ObjectId(schoolId) };
        if (month && year) {
            match.month = month;
            match.year = parseInt(year);
        }

        const stats = await StudentInvoice.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalExpected: { $sum: "$totalAmount" },
                    totalCollected: { $sum: "$paidAmount" },
                    totalLateFines: { $sum: "$lateFine" }
                }
            }
        ]);

        res.send(stats.length > 0 ? stats[0] : { totalExpected: 0, totalCollected: 0, totalLateFines: 0 });

    } catch (err) {
        console.error("Error in getFeeStats:", err);
        res.status(500).json(err);
    }
};

const getStudentFeeHistory = async (req, res) => {
    try {
        const studentId = req.params.id;
        const student = await Student.findById(studentId).populate('sclassName', 'sclassName');

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const invoices = await StudentInvoice.find({ studentId })
            .sort({ year: -1, month: -1 }); // Latest first

        let totalDue = 0;
        let totalPaid = 0;

        invoices.forEach(inv => {
            const due = (inv.totalAmount + inv.lateFine) - inv.paidAmount;
            if (due > 0) totalDue += due;
            totalPaid += inv.paidAmount;
        });

        res.send({
            studentName: student.name,
            className: student.sclassName ? student.sclassName.sclassName : 'N/A',
            totalDue,
            totalPaid,
            invoices
        });

    } catch (err) {
        console.error("Error in getStudentFeeHistory:", err);
        res.status(500).json(err);
    }
};

const getDefaultersByClass = async (req, res) => {
    try {
        const classId = req.params.id;

        // Aggregate invoices to find total due per student
        const defaulters = await StudentInvoice.aggregate([
            { $match: { classId: new mongoose.Types.ObjectId(classId) } },
            {
                $group: {
                    _id: "$studentId",
                    totalAmount: { $sum: "$totalAmount" },
                    totalLateFine: { $sum: "$lateFine" },
                    totalPaid: { $sum: "$paidAmount" },
                    invoices: { $push: "$$ROOT" }
                }
            },
            {
                $project: {
                    studentId: "$_id",
                    totalDue: { $subtract: [{ $add: ["$totalAmount", "$totalLateFine"] }, "$totalPaid"] },
                    totalPaid: 1
                }
            },
            { $match: { totalDue: { $gt: 0 } } } // Only show students with pending balance
        ]);

        if (defaulters.length === 0) {
            return res.send([]);
        }

        // Populate student details
        const studentIds = defaulters.map(d => d.studentId);
        const students = await Student.find({ _id: { $in: studentIds } }, 'name rollNum');

        // Merge student details with aggregated data
        const result = defaulters.map(defaulter => {
            const student = students.find(s => s._id.toString() === defaulter.studentId.toString());
            return {
                ...defaulter,
                studentName: student ? student.name : 'Unknown',
                rollNum: student ? student.rollNum : 'N/A'
            };
        });

        res.send(result);

    } catch (err) {
        console.error("Error in getDefaultersByClass:", err);
        res.status(500).json(err);
    }
};

const searchStudentsFees = async (req, res) => {
    try {
        const { rollNum, classId, schoolId } = req.query;

        if (!schoolId) {
            return res.status(400).json({ message: "School ID is required" });
        }

        let studentQuery = { school: schoolId };
        if (rollNum) studentQuery.rollNum = rollNum;
        if (classId) studentQuery.sclassName = classId;

        const students = await Student.find(studentQuery).populate('sclassName', 'sclassName');

        if (students.length === 0) {
            return res.send([]);
        }

        const studentIds = students.map(s => s._id);

        // Aggregate invoices for these students
        const feeData = await StudentInvoice.aggregate([
            { $match: { studentId: { $in: studentIds } } },
            {
                $group: {
                    _id: "$studentId",
                    totalAmount: { $sum: "$totalAmount" },
                    totalLateFine: { $sum: "$lateFine" },
                    totalPaid: { $sum: "$paidAmount" }
                }
            }
        ]);

        const result = students.map(student => {
            const fees = feeData.find(f => f._id.toString() === student._id.toString()) || {
                totalAmount: 0,
                totalLateFine: 0,
                totalPaid: 0
            };

            return {
                studentId: student._id,
                studentName: student.name,
                rollNum: student.rollNum,
                className: student.sclassName ? student.sclassName.sclassName : 'N/A',
                totalDue: (fees.totalAmount + fees.totalLateFine) - fees.totalPaid,
                totalPaid: fees.totalPaid
            };
        });

        res.send(result);

    } catch (err) {
        console.error("Error in searchStudentsFees:", err);
        res.status(500).json(err);
    }
};

module.exports = {
    createFeeHead,
    getFeeHeads,
    createFeeStructure,
    getFeeStructure,
    generateInvoices,
    getInvoices,
    payInvoice,
    getFeeStats,
    getStudentFeeHistory,
    getDefaultersByClass,
    searchStudentsFees
};

