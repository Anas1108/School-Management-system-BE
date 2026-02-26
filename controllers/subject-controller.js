const Subject = require('../models/subjectSchema.js');
const Teacher = require('../models/teacherSchema.js');
const Student = require('../models/studentSchema.js');
const SubjectAllocation = require('../models/allocationSchema.js');

const subjectCreate = async (req, res) => {
    try {
        const subjects = req.body.subjects.map((subject) => ({
            subName: subject.subName,
            subCode: subject.subCode,
            sessions: subject.sessions,
        }));

        const existingSubjectBySubCode = await Subject.findOne({
            'subjects.subCode': subjects[0].subCode,
            school: req.body.adminID,
        });

        if (existingSubjectBySubCode) {
            res.send({ message: 'Sorry this subcode must be unique as it already exists' });
        } else {
            const newSubjects = subjects.map((subject) => ({
                ...subject,
                sclassName: req.body.sclassName,
                school: req.body.adminID,
            }));

            const result = await Subject.insertMany(newSubjects);
            res.send(result);
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const allSubjects = async (req, res) => {
    try {
        let subjects = await Subject.find({ school: req.params.id })
            .populate("sclassName", "sclassName");

        if (subjects.length > 0) {
            // Fetch all allocations for this school
            const allocations = await SubjectAllocation.find({ school: req.params.id, type: 'Primary' }).populate("teacherId", "name");
            const allocationMap = {};
            allocations.forEach(alloc => {
                allocationMap[alloc.subjectId.toString()] = alloc;
            });

            const subjectsWithTeachers = subjects.map(sub => {
                const subObj = sub.toObject();
                const alloc = allocationMap[sub._id.toString()];
                if (alloc && alloc.teacherId) {
                    subObj.teacher = alloc.teacherId;
                }
                return subObj;
            });

            res.send(subjectsWithTeachers);
        } else {
            res.send({ message: "No subjects found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const classSubjects = async (req, res) => {
    try {
        let subjects = await Subject.find({ sclassName: req.params.id })
            .populate("sclassName", "sclassName"); // Added populate for consistency

        if (subjects.length > 0) {
            const allocations = await SubjectAllocation.find({ classId: req.params.id, type: 'Primary' }).populate("teacherId", "name");
            const allocationMap = {};
            allocations.forEach(alloc => {
                allocationMap[alloc.subjectId.toString()] = alloc;
            });

            const subjectsWithTeachers = subjects.map(sub => {
                const subObj = sub.toObject();
                const alloc = allocationMap[sub._id.toString()];
                if (alloc && alloc.teacherId) {
                    subObj.teacher = alloc.teacherId;
                }
                return subObj;
            });

            res.send(subjectsWithTeachers);
        } else {
            res.send({ message: "No subjects found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const freeSubjectList = async (req, res) => {
    try {
        // Find all subjects for the class
        let subjects = await Subject.find({ sclassName: req.params.id });

        if (subjects.length > 0) {
            // Find all primary allocations for this class
            const allocations = await SubjectAllocation.find({ classId: req.params.id, type: 'Primary' });

            // Create a set of subject IDs that are already allocated
            const allocatedSubjectIds = new Set(allocations.map(alloc => alloc.subjectId.toString()));

            // Filter subjects to only those that are NOT in the allocated set
            const freeSubjects = subjects.filter(sub => !allocatedSubjectIds.has(sub._id.toString()));

            if (freeSubjects.length > 0) {
                res.send(freeSubjects);
            } else {
                res.send({ message: "No subjects found" });
            }
        } else {
            res.send({ message: "No subjects found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const getSubjectDetail = async (req, res) => {
    try {
        let subject = await Subject.findById(req.params.id);
        if (subject) {
            subject = await subject.populate("sclassName", "sclassName");

            // Look up teacher in SubjectAllocation table dynamically
            const allocation = await SubjectAllocation.findOne({ subjectId: subject._id, type: 'Primary' }).populate("teacherId", "name");

            // Convert Mongoose document to plain object to attach teacher dynamically
            subject = subject.toObject();
            if (allocation && allocation.teacherId) {
                subject.teacher = allocation.teacherId;
            } else if (subject.teacher) { // Fallback to old field
                const teacherObj = await Teacher.findById(subject.teacher).select("name");
                if (teacherObj) subject.teacher = teacherObj;
            }

            res.send(subject);
        }
        else {
            res.send({ message: "No subject found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
}

const deleteSubject = async (req, res) => {
    try {
        const deletedSubject = await Subject.findByIdAndDelete(req.params.id);

        if (!deletedSubject) {
            return res.send({ message: "Subject not found" });
        }

        // Set the teachSubject field to null in teachers
        await Teacher.updateOne(
            { teachSubject: deletedSubject._id },
            { $unset: { teachSubject: "" }, $unset: { teachSubject: null } }
        );

        // Remove the objects containing the deleted subject from students' examResult array
        await Student.updateMany(
            { 'examResult.subName': deletedSubject._id },
            { $pull: { examResult: { subName: deletedSubject._id } } }
        );

        // Clean up orphaned SubjectAllocation records
        await SubjectAllocation.deleteMany({ subjectId: deletedSubject._id });

        res.send(deletedSubject);
    } catch (error) {
        res.status(500).json(error);
    }
};

const deleteSubjects = async (req, res) => {
    try {
        const deletedSubjects = await Subject.find({ school: req.params.id });
        const subjectIds = deletedSubjects.map(subject => subject._id);

        const deletionResult = await Subject.deleteMany({ school: req.params.id });

        // Set the teachSubject field to null in teachers
        await Teacher.updateMany(
            { teachSubject: { $in: subjectIds } },
            { $unset: { teachSubject: "" }, $unset: { teachSubject: null } }
        );

        // Properly pull the deleted subjects from exam result arrays, instead of wiping the whole array
        await Student.updateMany(
            { 'examResult.subName': { $in: subjectIds } },
            { $pull: { examResult: { subName: { $in: subjectIds } } } }
        );

        // Clean up orphaned SubjectAllocation records
        await SubjectAllocation.deleteMany({ subjectId: { $in: subjectIds } });

        res.send(deletionResult);
    } catch (error) {
        res.status(500).json(error);
    }
};

const deleteSubjectsByClass = async (req, res) => {
    try {
        const deletedSubjects = await Subject.find({ sclassName: req.params.id });
        const subjectIds = deletedSubjects.map(subject => subject._id);

        const deletionResult = await Subject.deleteMany({ sclassName: req.params.id });

        // Set the teachSubject field to null in teachers
        await Teacher.updateMany(
            { teachSubject: { $in: subjectIds } },
            { $unset: { teachSubject: "" }, $unset: { teachSubject: null } }
        );

        // Properly pull the deleted subjects from exam result arrays, instead of wiping the whole array
        await Student.updateMany(
            { 'examResult.subName': { $in: subjectIds } },
            { $pull: { examResult: { subName: { $in: subjectIds } } } }
        );

        // Clean up orphaned SubjectAllocation records
        await SubjectAllocation.deleteMany({ subjectId: { $in: subjectIds } });

        res.send(deletionResult);
    } catch (error) {
        res.status(500).json(error);
    }
};

const updateSubject = async (req, res) => {
    try {
        const result = await Subject.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        res.send(result);
    } catch (error) {
        res.status(500).json(error);
    }
};

module.exports = { subjectCreate, freeSubjectList, classSubjects, getSubjectDetail, deleteSubjectsByClass, deleteSubjects, deleteSubject, allSubjects, updateSubject };