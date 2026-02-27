const bcrypt = require('bcrypt');
const Teacher = require('../models/teacherSchema.js');
const Subject = require('../models/subjectSchema.js');

const Department = require('../models/departmentSchema.js');

const teacherRegister = async (req, res) => {
    try {
        const {
            name, email, password, role, school, teachSubject, teachSclass,
            phone, cnic, qualification, designation, department, joiningDate, salary,
            subjectSpecialization, policeVerification, serviceBookNumber
        } = req.body;

        const existingTeacherByEmail = await Teacher.findOne({ email });

        if (existingTeacherByEmail) {
            res.send({ message: 'Email already exists' });
        } else {
            let departmentId = department;
            // If department is provided as a name (string), find or create it
            if (department && typeof department === 'string') {
                let dept = await Department.findOne({ departmentName: department });
                if (!dept) {
                    dept = new Department({ departmentName: department });
                    await dept.save();
                }
                departmentId = dept._id;
            }

            const teacher = new Teacher({
                name, email, password, role, school, teachSubject, teachSclass,
                phone, cnic, qualification, designation,
                department: departmentId,
                joiningDate, salary,
                subjectSpecialization, policeVerification, serviceBookNumber
            });

            let result = await teacher.save();
            // Assuming teachSubject is a single ID for the "Main" subject?
            // The schema has subjectSpecialization array too.
            // Keeping existing logic for teachSubject update
            if (teachSubject) {
                await Subject.findByIdAndUpdate(teachSubject, { teacher: teacher._id });
            }

            result.password = undefined;
            res.send(result);
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const teacherLogIn = async (req, res) => {
    try {
        let teacher = await Teacher.findOne({ email: req.body.email });
        if (teacher) {
            const validated = await bcrypt.compare(req.body.password, teacher.password);
            if (validated) {
                teacher = await teacher.populate("teachSubject", "subName sessions")
                teacher = await teacher.populate("school", "schoolName")
                teacher = await teacher.populate("teachSclass", "sclassName")
                teacher.password = undefined;
                res.send(teacher);
            } else {
                res.send({ message: "Invalid password" });
            }
        } else {
            res.send({ message: "Teacher not found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const getTeachers = async (req, res) => {
    try {
        const { page, limit, search } = req.query;
        // query for filtering by school
        let query = { school: req.params.id };

        // If specific filters are needed (department/designation), they can be added here
        // const { department, designation } = req.query;
        // if (department) query.department = department;
        // if (designation) query.designation = designation;

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { name: searchRegex },
                { email: searchRegex }
            ];
        }

        if (page && limit) {
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            const total = await Teacher.countDocuments(query);
            const teachers = await Teacher.find(query)
                .populate("teachSubject", "subName")
                .populate("teachSclass", "sclassName")
                .populate("department", "departmentName")
                .skip(skip)
                .limit(limitNum);

            if (teachers.length > 0) {
                let modifiedTeachers = teachers.map((teacher) => {
                    return { ...teacher._doc, password: undefined };
                });
                res.send({
                    teachers: modifiedTeachers,
                    total,
                    page: pageNum,
                    pages: Math.ceil(total / limitNum)
                });
            } else {
                res.send({ message: "No teachers found", teachers: [], total: 0 });
            }
        } else {
            // Backward compatibility
            let teachers = await Teacher.find(query)
                .populate("teachSubject", "subName")
                .populate("teachSclass", "sclassName")
                .populate("department", "departmentName");

            if (teachers.length > 0) {
                let modifiedTeachers = teachers.map((teacher) => {
                    return { ...teacher._doc, password: undefined };
                });
                res.send(modifiedTeachers);
            } else {
                res.send({ message: "No teachers found" });
            }
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const getTeacherDetail = async (req, res) => {
    try {
        let teacher = await Teacher.findById(req.params.id)
            .populate("teachSubject", "subName sessions")
            .populate("school", "schoolName")
            .populate("teachSclass", "sclassName")
            .populate("department", "departmentName");

        if (teacher) {
            teacher.password = undefined;
            res.send(teacher);
        }
        else {
            res.send({ message: "No teacher found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
}

const updateTeacherSubject = async (req, res) => {
    const { teacherId, teachSubject } = req.body;
    try {
        const currentTeacher = await Teacher.findById(teacherId);
        if (currentTeacher && currentTeacher.teachSubject) {
            // Remove teacher from old subject
            await Subject.findByIdAndUpdate(currentTeacher.teachSubject, { $unset: { teacher: "" } });
        }

        const updatedTeacher = await Teacher.findByIdAndUpdate(
            teacherId,
            { teachSubject },
            { new: true }
        );

        if (teachSubject) {
            await Subject.findByIdAndUpdate(teachSubject, { teacher: updatedTeacher._id });
        }

        res.send(updatedTeacher);
    } catch (error) {
        res.status(500).json(error);
    }
};

const deleteTeacher = async (req, res) => {
    try {
        const deletedTeacher = await Teacher.findByIdAndDelete(req.params.id);

        await Subject.updateMany(
            { teacher: deletedTeacher._id, teacher: { $exists: true } },
            { $unset: { teacher: 1 } }
        );

        // Remove from Sclass.classTeacher
        await Sclass.updateMany(
            { classTeacher: deletedTeacher._id },
            { $unset: { classTeacher: "" } }
        );

        // Clean up orphaned SubjectAllocation records
        await SubjectAllocation.deleteMany({ teacherId: deletedTeacher._id });

        res.send(deletedTeacher);
    } catch (error) {
        res.status(500).json(error);
    }
};

const deleteTeachers = async (req, res) => {
    try {
        const deletedTeachers = await Teacher.find({ school: req.params.id });
        const deletionResult = await Teacher.deleteMany({ school: req.params.id });

        const deletedCount = deletionResult.deletedCount || 0;

        if (deletedCount === 0) {
            res.send({ message: "No teachers found to delete" });
            return;
        }

        const teacherIds = deletedTeachers.map(teacher => teacher._id);

        await Subject.updateMany(
            { teacher: { $in: teacherIds }, teacher: { $exists: true } },
            { $unset: { teacher: "" }, $unset: { teacher: null } }
        );

        // Remove from Sclass.classTeacher
        await Sclass.updateMany(
            { classTeacher: { $in: teacherIds } },
            { $unset: { classTeacher: "" } }
        );

        // Clean up orphaned SubjectAllocation records
        await SubjectAllocation.deleteMany({ teacherId: { $in: teacherIds } });

        res.send(deletionResult);
    } catch (error) {
        res.status(500).json(error);
    }
};

const deleteTeachersByClass = async (req, res) => {
    try {
        const deletedTeachers = await Teacher.find({ sclassName: req.params.id });
        const deletionResult = await Teacher.deleteMany({ sclassName: req.params.id });

        const deletedCount = deletionResult.deletedCount || 0;

        if (deletedCount === 0) {
            res.send({ message: "No teachers found to delete" });
            return;
        }

        const teacherIds = deletedTeachers.map(teacher => teacher._id);

        await Subject.updateMany(
            { teacher: { $in: teacherIds }, teacher: { $exists: true } },
            { $unset: { teacher: "" }, $unset: { teacher: null } }
        );

        // Remove from Sclass.classTeacher
        await Sclass.updateMany(
            { classTeacher: { $in: teacherIds } },
            { $unset: { classTeacher: "" } }
        );

        // Clean up orphaned SubjectAllocation records
        await SubjectAllocation.deleteMany({ teacherId: { $in: teacherIds } });

        res.send(deletionResult);
    } catch (error) {
        res.status(500).json(error);
    }
};

const updateTeacher = async (req, res) => {
    try {
        if (req.body.password) {
            const salt = await bcrypt.genSalt(10)
            req.body.password = await bcrypt.hash(req.body.password, salt)
        }
        let result = await Teacher.findByIdAndUpdate(req.params.id,
            { $set: req.body },
            { new: true })
        result.password = undefined;
        res.send(result)
    } catch (error) {
        res.status(500).json(error);
    }
}



module.exports = {
    teacherRegister,
    teacherLogIn,
    getTeachers,
    getTeacherDetail,
    updateTeacherSubject,
    deleteTeacher,
    deleteTeachers,
    deleteTeachersByClass,
    updateTeacher
};