const bcrypt = require('bcrypt');
const Student = require('../models/studentSchema.js');
const Subject = require('../models/subjectSchema.js');

const Family = require('../models/familySchema.js');
const FeeStructure = require('../models/feeStructureSchema.js');
const StudentInvoice = require('../models/studentInvoiceSchema.js');
const StudentDiscount = require('../models/studentDiscountSchema.js');
const Sclass = require('../models/sclassSchema.js');

const regenerateCurrentMonthInvoice = async (studentId, newClassId, schoolId) => {
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    // Find current month's unpaid or partial invoice
    const existingInvoice = await StudentInvoice.findOne({
        studentId: studentId,
        month,
        year,
        status: { $ne: 'Paid' }
    });

    if (existingInvoice) {
        let previousPaidAmount = existingInvoice.paidAmount || 0;
        await StudentInvoice.findByIdAndDelete(existingInvoice._id);

        // Generate new invoice for new class
        const feeStructure = await FeeStructure.findOne({ classId: newClassId }).populate('feeHeads.headId');

        if (feeStructure) {
            // Calculate previous arrears
            const previousInvoices = await StudentInvoice.find({ studentId: studentId });
            let balance = 0;
            previousInvoices.forEach(inv => {
                balance += (inv.totalAmount + inv.lateFine) - inv.paidAmount;
            });

            let previousArrears = balance > 0 ? balance : 0;

            let currentFee = 0;
            const detailedBreakdown = feeStructure.feeHeads.map(head => {
                currentFee += head.amount;
                return {
                    headName: head.headId.name,
                    amount: head.amount
                };
            });

            // Calculate Discounts
            const discounts = await StudentDiscount.find({ studentId, status: 'Active' }).populate('discountGroup');
            let totalDiscount = 0;
            const discountBreakdown = discounts.map(discount => {
                let discountName = discount.discountGroup ? discount.discountGroup.name : discount.customName;
                let amount = 0;
                if (discount.type === 'Percentage') {
                    amount = (currentFee * discount.value) / 100;
                } else if (discount.type === 'FixedAmount') {
                    amount = discount.value;
                }
                totalDiscount += amount;
                return {
                    discountName,
                    amount
                };
            });

            let finalAmount = currentFee - totalDiscount;
            if (finalAmount < 0) finalAmount = 0;

            const studIdStr = studentId.toString();
            const shortId = studIdStr.substring(studIdStr.length - 4).toUpperCase();
            const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
            const challanNumber = `SCH-${year}-${month}-${shortId}-${randomPart}`;

            const dueDay = feeStructure.dueDay || 10;
            const daysInMonth = new Date(year, month, 0).getDate();
            const actualDueDay = Math.min(dueDay, daysInMonth);
            const dueDate = new Date(year, month - 1, actualDueDay);

            let totalDue = finalAmount > 0 ? finalAmount : 0;
            let newStatus = 'Unpaid';
            if (previousPaidAmount >= (totalDue + previousArrears)) {
                newStatus = 'Paid';
            } else if (previousPaidAmount > 0) {
                newStatus = 'Partial';
            }

            const newInvoice = new StudentInvoice({
                studentId: studentId,
                school: schoolId,
                classId: newClassId,
                month,
                year,
                challanNumber,
                feeBreakdown: detailedBreakdown,
                discountBreakdown: discountBreakdown,
                previousArrears,
                totalAmount: totalDue,
                dueDate,
                paidAmount: previousPaidAmount,
                status: newStatus
            });

            await newInvoice.save();
        }
    }
};

const searchFamily = async (req, res) => {
    try {
        const { familyName } = req.body;
        if (!familyName) return res.send({ message: "Family Name is required" });

        const searchRegex = new RegExp(familyName, 'i');
        const families = await Family.find({ familyName: searchRegex });

        if (families.length > 0) {
            res.send({ message: "Family found", families });
        } else {
            res.send({ message: "Family not found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
}

const studentRegister = async (req, res) => {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(req.body.password, salt);

        const { familyId, familyDetails, ...studentData } = req.body;
        let finalFamilyId = familyId;

        // Validation for CNIC and BForm
        const cnicPattern = /^\d{5}-\d{7}-\d{1}$/;
        if (studentData.studentBForm && !cnicPattern.test(studentData.studentBForm)) {
            return res.send({ message: "Invalid Student B-Form format. Use XXXXX-XXXXXXX-X" });
        }

        // Check if student B-Form already exists
        const existingBForm = await Student.findOne({ studentBForm: studentData.studentBForm });
        if (existingBForm) {
            return res.send({ message: "Student with this B-Form already exists" });
        }

        // Case A: New Family
        if (!finalFamilyId) {
            if (!familyDetails) return res.send({ message: "Family details are required for new family" });

            if (familyDetails.fatherCNIC && !cnicPattern.test(familyDetails.fatherCNIC)) {
                return res.send({ message: "Invalid Father CNIC format. Use XXXXX-XXXXXXX-X" });
            }

            const newFamily = new Family({
                ...familyDetails,
                school: req.body.adminID
            });
            const savedFamily = await newFamily.save();
            finalFamilyId = savedFamily._id;
        }

        const existingStudent = await Student.findOne({
            rollNum: req.body.rollNum,
            school: req.body.adminID,
            sclassName: req.body.sclassName,
        });

        if (existingStudent) {
            res.send({ message: 'Roll Number already exists' });
        }
        else {
            const student = new Student({
                ...studentData,
                familyId: finalFamilyId,
                school: req.body.adminID,
                password: hashedPass
            });

            let result = await student.save();

            // Update Family with new student ID
            await Family.findByIdAndUpdate(finalFamilyId, { $push: { students: result._id } });

            result.password = undefined;
            res.send(result);
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const studentLogIn = async (req, res) => {
    try {
        let student = await Student.findOne({ rollNum: req.body.rollNum, name: req.body.studentName });
        if (student) {
            const validated = await bcrypt.compare(req.body.password, student.password);
            if (validated) {
                student = await student.populate("school", "schoolName")
                student = await student.populate("sclassName", "sclassName")
                student.password = undefined;
                student.examResult = undefined;
                res.send(student);
            } else {
                res.send({ message: "Invalid password" });
            }
        } else {
            res.send({ message: "Student not found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const getStudents = async (req, res) => {
    try {
        const { page, limit, search } = req.query;
        const schoolId = req.params.id;

        // Base query
        let query = { school: schoolId };

        if (req.query.status === 'Retired') {
            query.status = 'Retired';
        } else {
            query.status = { $ne: 'Retired' };
        }

        // Add search functionality if search term is provided
        if (search) {
            const searchRegex = new RegExp(search, 'i');

            // Find class IDs that match the search term to include students from those classes
            const matchedClasses = await Sclass.find({ school: schoolId, sclassName: searchRegex }).select('_id');
            const matchedClassIds = matchedClasses.map(c => c._id);

            const isNumeric = !isNaN(search);
            if (isNumeric) {
                query.$or = [
                    { name: searchRegex },
                    { rollNum: search },
                    { sclassName: { $in: matchedClassIds } }
                ];
            } else {
                query.$or = [
                    { name: searchRegex },
                    { sclassName: { $in: matchedClassIds } }
                ];
            }

            // If rollNum is strictly number in schema, we might need a different approach, 
            // but usually regex on stringified number works in mongo if stored as string.
            // Adjusting based on schema assumption (usually mixed or string for rollNum to support dashes etc)
        }

        if (page && limit) {
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            const total = await Student.countDocuments(query);
            const students = await Student.find(query)
                .select('-examResult')
                .populate("sclassName", "sclassName")
                .skip(skip)
                .limit(limitNum);

            if (students.length > 0) {
                let modifiedStudents = students.map((student) => {
                    return { ...student._doc, password: undefined };
                });
                res.send({
                    students: modifiedStudents,
                    total,
                    page: pageNum,
                    pages: Math.ceil(total / limitNum)
                });
            } else {
                res.send({ message: "No students found", students: [], total: 0 });
            }
        } else {
            // Backward compatibility: Validation for existing usages (AdminDashboard etc)
            let students = await Student.find(query).select('-examResult').populate("sclassName", "sclassName");
            if (students.length > 0) {
                let modifiedStudents = students.map((student) => {
                    return { ...student._doc, password: undefined };
                });
                res.send(modifiedStudents);
            } else {
                res.send({ message: "No students found" });
            }
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const getStudentDetail = async (req, res) => {
    try {
        let student = await Student.findById(req.params.id)
            .populate("school", "schoolName")
            .populate("sclassName", "sclassName")
            .populate("familyId") // Populate family details
            .populate("examResult.subName", "subName");
        if (student) {
            student.password = undefined;
            res.send(student);
        }
        else {
            res.send({ message: "No student found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
}

const deleteStudent = async (req, res) => {
    try {
        const result = await Student.findByIdAndDelete(req.params.id)

        if (result) {
            // Remove the student ID from their Family's students array
            await Family.updateOne(
                { students: result._id },
                { $pull: { students: result._id } }
            );

            // Clean up any billing invoices associated with this student
            await StudentInvoice.deleteMany({ studentId: result._id });
            // Clean up any discounts associated with this student
            await StudentDiscount.deleteMany({ studentId: result._id });
        }

        res.send(result)
    } catch (error) {
        res.status(500).json(error);
    }
}

const deleteStudents = async (req, res) => {
    try {
        const deletedStudents = await Student.find({ school: req.params.id });
        const studentIds = deletedStudents.map(student => student._id);

        const result = await Student.deleteMany({ school: req.params.id })
        if (result.deletedCount === 0) {
            res.send({ message: "No students found to delete" })
        } else {
            // Remove all these student IDs from their Family's students array
            await Family.updateMany(
                { students: { $in: studentIds } },
                { $pull: { students: { $in: studentIds } } }
            );

            // Clean up any billing invoices associated with these students
            await StudentInvoice.deleteMany({ studentId: { $in: studentIds } });
            // Clean up any discounts associated with these students
            await StudentDiscount.deleteMany({ studentId: { $in: studentIds } });

            res.send(result)
        }
    } catch (error) {
        res.status(500).json(error);
    }
}

const deleteStudentsByClass = async (req, res) => {
    try {
        const deletedStudents = await Student.find({ sclassName: req.params.id });
        const studentIds = deletedStudents.map(student => student._id);

        const result = await Student.deleteMany({ sclassName: req.params.id })
        if (result.deletedCount === 0) {
            res.send({ message: "No students found to delete" })
        } else {
            // Remove all these student IDs from their Family's students array
            await Family.updateMany(
                { students: { $in: studentIds } },
                { $pull: { students: { $in: studentIds } } }
            );

            // Clean up any billing invoices associated with these students
            await StudentInvoice.deleteMany({ studentId: { $in: studentIds } });
            // Clean up any discounts associated with these students
            await StudentDiscount.deleteMany({ studentId: { $in: studentIds } });

            res.send(result)
        }
    } catch (error) {
        res.status(500).json(error);
    }
}

const updateStudent = async (req, res) => {
    try {
        if (req.body.password) {
            const salt = await bcrypt.genSalt(10)
            req.body.password = await bcrypt.hash(req.body.password, salt)
        }

        // Handle Family Update
        if (req.body.familyDetails && req.body.familyId) {
            await Family.findByIdAndUpdate(req.body.familyId,
                { $set: req.body.familyDetails },
                { new: true }
            );
        }

        const oldStudent = await Student.findById(req.params.id);

        let result = await Student.findByIdAndUpdate(req.params.id,
            { $set: req.body },
            { new: true })

        // Check if class changed and student is not retired
        if (req.body.sclassName && oldStudent.sclassName.toString() !== req.body.sclassName.toString() && oldStudent.status !== 'Retired') {
            await regenerateCurrentMonthInvoice(req.params.id, req.body.sclassName, result.school);
        }

        result.password = undefined;
        res.send(result)
    } catch (error) {
        res.status(500).json(error);
    }
}

const updateExamResult = async (req, res) => {
    const { subName, marksObtained } = req.body;

    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.send({ message: 'Student not found' });
        }

        const existingResult = student.examResult.find(
            (result) => result.subName.toString() === subName
        );

        if (existingResult) {
            existingResult.marksObtained = marksObtained;
        } else {
            student.examResult.push({ subName, marksObtained });
        }

        const result = await student.save();
        return res.send(result);
    } catch (error) {
        res.status(500).json(error);
    }
};



const getAllFamilies = async (req, res) => {
    try {
        const schoolId = req.params.id;
        const families = await Family.find({ school: schoolId });
        res.send(families);
    } catch (err) {
        res.status(500).json(err);
    }
}

const getFamilyDetails = async (req, res) => {
    try {
        const family = await Family.findById(req.params.id).populate("students", "name rollNum sclassName");
        if (family) {
            // Populate classes for students if needed, but since it's just sclassName we might want to populate that inside
            const populatedFamily = await Family.findById(req.params.id).populate({
                path: 'students',
                select: 'name rollNum sclassName',
                populate: {
                    path: 'sclassName',
                    select: 'sclassName'
                }
            });
            res.send(populatedFamily);
        } else {
            res.send({ message: "Family not found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
}


const familyCreate = async (req, res) => {
    try {
        const { familyName, fatherName, fatherPhone, homeAddress, adminID, ...otherDetails } = req.body;

        if (!familyName || !fatherName || !fatherPhone || !homeAddress) {
            return res.send({ message: "Family Name, Father Name, Father Phone, and Home Address are required" });
        }

        // Optional validation for CNIC limit
        if (otherDetails.fatherCNIC) {
            const cnicPattern = /^\d{5}-\d{7}-\d{1}$/;
            if (!cnicPattern.test(otherDetails.fatherCNIC)) {
                return res.send({ message: "Invalid Father CNIC format. Use XXXXX-XXXXXXX-X" });
            }
        }

        const newFamily = new Family({
            familyName,
            fatherName,
            fatherPhone,
            homeAddress,
            school: adminID,
            ...otherDetails
        });

        const savedFamily = await newFamily.save();
        res.send(savedFamily);
    } catch (err) {
        res.status(500).json(err);
    }
}

const updateFamily = async (req, res) => {
    try {
        const result = await Family.findByIdAndUpdate(req.params.id,
            { $set: req.body },
            { new: true }
        );
        res.send(result);
    } catch (error) {
        res.status(500).json(error);
    }
}

const deleteFamily = async (req, res) => {
    try {
        const family = await Family.findById(req.params.id);
        if (!family) {
            return res.send({ message: "Family not found" });
        }
        if (family.students && family.students.length > 0) {
            return res.send({ message: "Cannot delete family because students are still enrolled." });
        }

        const result = await Family.findByIdAndDelete(req.params.id);
        res.send(result);
    } catch (error) {
        res.status(500).json(error);
    }
}

const promoteStudents = async (req, res) => {
    try {
        const { studentIds, targetClassId, clearRecords, targetSessionYear } = req.body;

        if (!studentIds || !targetClassId) {
            return res.send({ message: "Student IDs and Target Class ID are required" });
        }

        const updateData = { sclassName: targetClassId };

        if (targetSessionYear) {
            updateData.sessionYear = targetSessionYear;
        }

        if (clearRecords) {
            updateData.examResult = [];
        }

        const result = await Student.updateMany(
            { _id: { $in: studentIds } },
            { $set: updateData }
        );

        // Regenerate invoices for the new class if they have an unpaid invoice for the current month
        for (const studentId of studentIds) {
            const student = await Student.findById(studentId);
            if (student && student.status !== 'Retired') {
                await regenerateCurrentMonthInvoice(studentId, targetClassId, student.school);
            }
        }

        res.send({ message: "Students promoted successfully", result });
    } catch (err) {
        res.status(500).json(err);
    }
}

const retireStudents = async (req, res) => {
    try {
        const { studentIds } = req.body;

        if (!studentIds || !studentIds.length) {
            return res.send({ message: "Student IDs are required" });
        }

        const result = await Student.updateMany(
            { _id: { $in: studentIds } },
            { $set: { status: 'Retired', retirementDate: new Date() } }
        );

        res.send({ message: "Students retired successfully", result });
    } catch (err) {
        res.status(500).json(err);
    }
}

module.exports = {
    studentRegister,
    studentLogIn,
    getStudents,
    getStudentDetail,
    deleteStudents,
    deleteStudent,
    updateStudent,
    deleteStudentsByClass,
    updateExamResult,

    searchFamily,
    getAllFamilies,
    getFamilyDetails,
    familyCreate,
    updateFamily,
    deleteFamily,
    promoteStudents,
    retireStudents
};