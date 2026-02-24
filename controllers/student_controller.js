const bcrypt = require('bcrypt');
const Student = require('../models/studentSchema.js');
const Subject = require('../models/subjectSchema.js');

const Family = require('../models/familySchema.js');
const FeeStructure = require('../models/feeStructureSchema.js');
const StudentInvoice = require('../models/studentInvoiceSchema.js');

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
                student.attendance = undefined;
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

        // Add search functionality if search term is provided
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            const isNumeric = !isNaN(search);
            if (isNumeric) {
                query.$or = [
                    { name: searchRegex },
                    { rollNum: search }
                ];
            } else {
                query.$or = [
                    { name: searchRegex }
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
            let students = await Student.find(query).populate("sclassName", "sclassName");
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
            .populate("examResult.subName", "subName")
            .populate("attendance.subName", "subName sessions");
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
        res.send(result)
    } catch (error) {
        res.status(500).json(err);
    }
}

const deleteStudents = async (req, res) => {
    try {
        const result = await Student.deleteMany({ school: req.params.id })
        if (result.deletedCount === 0) {
            res.send({ message: "No students found to delete" })
        } else {
            res.send(result)
        }
    } catch (error) {
        res.status(500).json(err);
    }
}

const deleteStudentsByClass = async (req, res) => {
    try {
        const result = await Student.deleteMany({ sclassName: req.params.id })
        if (result.deletedCount === 0) {
            res.send({ message: "No students found to delete" })
        } else {
            res.send(result)
        }
    } catch (error) {
        res.status(500).json(err);
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

        // Check if class changed
        if (req.body.sclassName && oldStudent.sclassName.toString() !== req.body.sclassName.toString()) {
            const currentDate = new Date();
            const month = currentDate.getMonth() + 1;
            const year = currentDate.getFullYear();

            // Find current month's unpaid invoice
            const existingInvoice = await StudentInvoice.findOne({
                studentId: req.params.id,
                month,
                year,
                status: 'Unpaid'
            });

            if (existingInvoice) {
                await StudentInvoice.findByIdAndDelete(existingInvoice._id);

                // Generate new invoice for new class
                const feeStructure = await FeeStructure.findOne({ classId: req.body.sclassName }).populate('feeHeads.headId');

                if (feeStructure) {
                    // Calculate previous arrears
                    const previousInvoices = await StudentInvoice.find({ studentId: req.params.id });
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

                    const studIdStr = req.params.id.toString();
                    const shortId = studIdStr.substring(studIdStr.length - 4).toUpperCase();
                    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
                    const challanNumber = `SCH-${year}-${month}-${shortId}-${randomPart}`;

                    const dueDay = feeStructure.dueDay || 10;
                    const daysInMonth = new Date(year, month, 0).getDate();
                    const actualDueDay = Math.min(dueDay, daysInMonth);
                    const dueDate = new Date(year, month - 1, actualDueDay);

                    const newInvoice = new StudentInvoice({
                        studentId: req.params.id,
                        school: result.school,
                        classId: req.body.sclassName,
                        month,
                        year,
                        challanNumber,
                        feeBreakdown: detailedBreakdown,
                        previousArrears,
                        totalAmount: currentFee > 0 ? currentFee : 0,
                        dueDate,
                        status: currentFee <= 0 ? 'Paid' : 'Unpaid'
                    });

                    await newInvoice.save();
                }
            }
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

const studentAttendance = async (req, res) => {
    const { subName, status, date } = req.body;

    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.send({ message: 'Student not found' });
        }

        const subject = await Subject.findById(subName);

        const existingAttendance = student.attendance.find(
            (a) =>
                a.date.toDateString() === new Date(date).toDateString() &&
                a.subName.toString() === subName
        );

        if (existingAttendance) {
            existingAttendance.status = status;
        } else {
            // Check if the student has already attended the maximum number of sessions
            const attendedSessions = student.attendance.filter(
                (a) => a.subName.toString() === subName
            ).length;

            if (attendedSessions >= subject.sessions) {
                return res.send({ message: 'Maximum attendance limit reached' });
            }

            student.attendance.push({ date, status, subName });
        }

        const result = await student.save();
        return res.send(result);
    } catch (error) {
        res.status(500).json(error);
    }
};

const clearAllStudentsAttendanceBySubject = async (req, res) => {
    const subName = req.params.id;

    try {
        const result = await Student.updateMany(
            { 'attendance.subName': subName },
            { $pull: { attendance: { subName } } }
        );
        return res.send(result);
    } catch (error) {
        res.status(500).json(error);
    }
};

const clearAllStudentsAttendance = async (req, res) => {
    const schoolId = req.params.id

    try {
        const result = await Student.updateMany(
            { school: schoolId },
            { $set: { attendance: [] } }
        );

        return res.send(result);
    } catch (error) {
        res.status(500).json(error);
    }
};

const removeStudentAttendanceBySubject = async (req, res) => {
    const studentId = req.params.id;
    const subName = req.body.subId

    try {
        const result = await Student.updateOne(
            { _id: studentId },
            { $pull: { attendance: { subName: subName } } }
        );

        return res.send(result);
    } catch (error) {
        res.status(500).json(error);
    }
};


const removeStudentAttendance = async (req, res) => {
    const studentId = req.params.id;

    try {
        const result = await Student.updateOne(
            { _id: studentId },
            { $set: { attendance: [] } }
        );

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


module.exports = {
    studentRegister,
    studentLogIn,
    getStudents,
    getStudentDetail,
    deleteStudents,
    deleteStudent,
    updateStudent,
    studentAttendance,
    deleteStudentsByClass,
    updateExamResult,

    clearAllStudentsAttendanceBySubject,
    clearAllStudentsAttendance,
    removeStudentAttendanceBySubject,
    removeStudentAttendance,
    searchFamily,
    getAllFamilies,
    getFamilyDetails
};