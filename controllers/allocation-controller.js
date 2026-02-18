const SubjectAllocation = require('../models/allocationSchema');
const Subject = require('../models/subjectSchema');
const Teacher = require('../models/teacherSchema');
const Sclass = require('../models/sclassSchema');

const allocateSubjects = async (req, res) => {
    try {
        const { teacherId, classId, subjects, academicYear, schoolId } = req.body;

        if (!teacherId || !classId || !subjects || !academicYear || !schoolId) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const allocationResults = [];
        const errors = [];

        for (const subjectId of subjects) {
            // Check for existing allocation for this subject in this class/year
            const existingAllocation = await SubjectAllocation.findOne({
                classId,
                subjectId,
                academicYear,
                school: schoolId
            });

            if (existingAllocation) {
                if (existingAllocation.teacherId.toString() !== teacherId) {
                    const subject = await Subject.findById(subjectId);
                    const teacher = await Teacher.findById(existingAllocation.teacherId);
                    errors.push(`Subject ${subject ? subject.subName : subjectId} is already assigned to ${teacher ? teacher.name : 'another teacher'}`);
                    continue;
                } else {
                    // Already assigned to this teacher, skip
                    continue;
                }
            }

            const newAllocation = new SubjectAllocation({
                teacherId,
                classId,
                subjectId,
                academicYear,
                school: schoolId,
                isClassIncharge: req.body.isClassIncharge,
                type: req.body.type
            });

            await newAllocation.save();
            allocationResults.push(newAllocation);
        }

        if (errors.length > 0) {
            return res.status(409).json({ message: "Some subjects could not be assigned", errors, success: allocationResults });
        }

        res.status(200).json({ message: "Subjects allocated successfully", result: allocationResults });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getTeacherWorkload = async (req, res) => {
    try {
        const result = await SubjectAllocation.find({ teacherId: req.params.id })
            .populate("subjectId", "subName subCode sessions")
            .populate("classId", "sclassName");

        if (!result) {
            return res.status(404).json({ message: "No workload found for this teacher" });
        }

        res.send(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { allocateSubjects, getTeacherWorkload };
