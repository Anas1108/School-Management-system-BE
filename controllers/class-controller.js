const Sclass = require('../models/sclassSchema.js');
const Student = require('../models/studentSchema.js');
const Subject = require('../models/subjectSchema.js');
const Teacher = require('../models/teacherSchema.js');
const SubjectAllocation = require('../models/allocationSchema.js');
const FeeStructure = require('../models/feeStructureSchema.js');
const Family = require('../models/familySchema.js');
const StudentInvoice = require('../models/studentInvoiceSchema.js');
const StudentDiscount = require('../models/studentDiscountSchema.js');

const sclassCreate = async (req, res) => {
    try {
        const sclass = new Sclass({
            sclassName: req.body.sclassName,
            school: req.body.adminID
        });

        const existingSclassByName = await Sclass.findOne({
            sclassName: req.body.sclassName,
            school: req.body.adminID
        });

        if (existingSclassByName) {
            res.send({ message: 'Sorry this class name already exists' });
        }
        else {
            const result = await sclass.save();
            res.send(result);
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const sclassList = async (req, res) => {
    try {
        let sclasses = await Sclass.find({ school: req.params.id }).populate('classTeacher', 'name');
        if (sclasses.length > 0) {
            res.send(sclasses)
        } else {
            res.send({ message: "No sclasses found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const getSclassDetail = async (req, res) => {
    try {
        let sclass = await Sclass.findById(req.params.id);
        if (sclass) {
            sclass = await sclass.populate([{ path: "school", select: "schoolName" }, { path: "classTeacher" }]);
            res.send(sclass);
        }
        else {
            res.send({ message: "No class found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
}

const getSclassStudents = async (req, res) => {
    try {
        let students = await Student.find({ sclassName: req.params.id, status: { $ne: 'Retired' } });
        if (students.length > 0) {
            let modifiedStudents = students.map((student) => {
                return { ...student._doc, password: undefined };
            });
            res.send(modifiedStudents);
        } else {
            res.send({ message: "No students found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
}

const deleteSclass = async (req, res) => {
    try {
        const deletedClass = await Sclass.findByIdAndDelete(req.params.id);
        if (!deletedClass) {
            return res.send({ message: "Class not found" });
        }

        const deletedStudents = await Student.find({ sclassName: req.params.id });
        const studentIds = deletedStudents.map(student => student._id);

        await Student.deleteMany({ sclassName: req.params.id });
        await Subject.deleteMany({ sclassName: req.params.id });

        // Update teachers instead of deleting them!
        await Teacher.updateMany(
            { teachSclass: req.params.id },
            { $unset: { teachSclass: "" } }
        );
        await Teacher.updateMany(
            { classTeacher: req.params.id }, // in case we used this
            { $unset: { classTeacher: "" } }
        );

        // Clean up orphaned records
        await SubjectAllocation.deleteMany({ classId: req.params.id });
        await FeeStructure.deleteMany({ classId: req.params.id });

        // Cascaded Student Cleanups
        if (studentIds.length > 0) {
            await Family.updateMany(
                { students: { $in: studentIds } },
                { $pull: { students: { $in: studentIds } } }
            );
            await StudentInvoice.deleteMany({ studentId: { $in: studentIds } });
            await StudentDiscount.deleteMany({ studentId: { $in: studentIds } });
        }

        res.send(deletedClass);
    } catch (error) {
        res.status(500).json(error);
    }
}

const deleteSclasses = async (req, res) => {
    try {
        const deletedClasses = await Sclass.find({ school: req.params.id });
        const classIds = deletedClasses.map(c => c._id);
        const deletionResult = await Sclass.deleteMany({ school: req.params.id });

        if (deletionResult.deletedCount === 0) {
            return res.send({ message: "No classes found to delete" });
        }

        const deletedStudents = await Student.find({ school: req.params.id });
        const studentIds = deletedStudents.map(student => student._id);

        await Student.deleteMany({ school: req.params.id });
        await Subject.deleteMany({ school: req.params.id });

        // Update teachers instead of deleting them!
        await Teacher.updateMany(
            { teachSclass: { $in: classIds } },
            { $unset: { teachSclass: "" } }
        );

        // Clean up orphaned records
        await SubjectAllocation.deleteMany({ school: req.params.id });
        await FeeStructure.deleteMany({ school: req.params.id });

        // Cascaded Student Cleanups
        if (studentIds.length > 0) {
            await Family.updateMany(
                { students: { $in: studentIds } },
                { $pull: { students: { $in: studentIds } } }
            );
            await StudentInvoice.deleteMany({ studentId: { $in: studentIds } });
        }

        res.send(deletionResult);
    } catch (error) {
        res.status(500).json(error);
    }
}

const updateSclass = async (req, res) => {
    try {
        const { sclassName } = req.body;
        const currentClass = await Sclass.findById(req.params.id);

        if (!currentClass) {
            return res.send({ message: "Class not found" });
        }

        const existingSclassByName = await Sclass.findOne({
            sclassName: sclassName,
            school: currentClass.school
        });

        if (existingSclassByName && existingSclassByName._id.toString() !== req.params.id) {
            return res.send({ message: 'Sorry this class name already exists' });
        }

        const updatedClass = await Sclass.findByIdAndUpdate(req.params.id, { sclassName }, { new: true });
        res.send(updatedClass);
    } catch (error) {
        res.status(500).json(error);
    }
}

const assignClassTeacher = async (req, res) => {
    try {
        const { teacherId } = req.body;
        const currentClassId = req.params.id;

        const currentClass = await Sclass.findById(currentClassId);
        if (!currentClass) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Check if this teacher is already assigned to another class as a class teacher
        const existingClassWithTeacher = await Sclass.findOne({
            classTeacher: teacherId,
            _id: { $ne: currentClassId },
            school: currentClass.school
        });

        if (existingClassWithTeacher) {
            return res.status(400).json({ message: `This teacher is already assigned as a class teacher for class: ${existingClassWithTeacher.sclassName}` });
        }

        // If there was a previous teacher, clear their teachSclass
        if (currentClass.classTeacher) {
            await Teacher.findByIdAndUpdate(currentClass.classTeacher, { $unset: { teachSclass: "" } });
        }

        // Update the class with new teacher
        const updatedClass = await Sclass.findByIdAndUpdate(currentClassId, { classTeacher: teacherId }, { new: true }).populate('classTeacher', 'name');

        // Update the teacher's teachSclass field for sync
        if (teacherId) {
            await Teacher.findByIdAndUpdate(teacherId, { teachSclass: currentClassId });
        }

        res.send(updatedClass);
    } catch (error) {
        res.status(500).json(error);
    }
}

const removeClassTeacher = async (req, res) => {
    try {
        const currentClass = await Sclass.findById(req.params.id);
        if (!currentClass) {
            return res.status(404).json({ message: "Class not found" });
        }

        const teacherId = currentClass.classTeacher;

        // Clear teachSclass for the teacher
        if (teacherId) {
            await Teacher.findByIdAndUpdate(teacherId, { $unset: { teachSclass: "" } });
        }

        const updatedClass = await Sclass.findByIdAndUpdate(req.params.id, { $unset: { classTeacher: "" } }, { new: true });
        res.send(updatedClass);
    } catch (error) {
        res.status(500).json(error);
    }
}

const getClassTeachers = async (req, res) => {
    try {
        let sclasses = await Sclass.find({ school: req.params.id, classTeacher: { $exists: true, $ne: null } }).populate('classTeacher', 'name');
        if (sclasses.length > 0) {
            res.send(sclasses)
        } else {
            res.send({ message: "No class teachers found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
}

module.exports = { sclassCreate, sclassList, deleteSclass, deleteSclasses, getSclassDetail, getSclassStudents, updateSclass, assignClassTeacher, removeClassTeacher, getClassTeachers };