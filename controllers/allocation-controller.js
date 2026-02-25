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

            // Synchronize with Subject model for backward compatibility and ViewSubject
            if (req.body.type === 'Primary') {
                await Subject.findByIdAndUpdate(subjectId, { teacher: teacherId });
            }

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

const getClassAllocations = async (req, res) => {
    try {
        const { id } = req.params; // Class ID
        const { schoolId, academicYear } = req.query;

        if (!schoolId || !academicYear) {
            return res.status(400).json({ message: "School ID and Academic Year are required" });
        }

        // 1. Fetch all subjects for this class
        const subjects = await Subject.find({ sclassName: id });

        if (subjects.length === 0) {
            return res.json([]);
        }

        // 2. Fetch all allocations for this class and academic year
        const allocations = await SubjectAllocation.find({
            classId: id,
            academicYear,
            school: schoolId
        }).populate("teacherId", "name");

        // 3. Map allocations for faster lookup
        const allocationMap = {};
        allocations.forEach(alloc => {
            allocationMap[alloc.subjectId.toString()] = alloc;
        });

        // 4. Combine data
        const result = subjects.map(sub => {
            const alloc = allocationMap[sub._id.toString()];
            return {
                subjectName: sub.subName,
                subjectCode: sub.subCode,
                subjectId: sub._id,
                isAllocated: !!alloc,
                allocationId: alloc ? alloc._id : null,
                teacherName: alloc ? alloc.teacherId.name : "Unassigned",
                teacherId: alloc ? alloc.teacherId._id : null,
                type: alloc ? alloc.type : null,
                isClassIncharge: alloc ? alloc.isClassIncharge : false
            };
        });

        res.json(result);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteAllocation = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await SubjectAllocation.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).json({ message: "Allocation not found" });
        }

        if (result.type === 'Primary') {
            await Subject.findByIdAndUpdate(result.subjectId, { $unset: { teacher: "" } });
        }

        res.json({ message: "Allocation deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateAllocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { teacherId, type, isClassIncharge } = req.body;

        if (!teacherId) {
            return res.status(400).json({ message: "Teacher is required" });
        }

        const allocation = await SubjectAllocation.findById(id);
        if (!allocation) {
            return res.status(404).json({ message: "Allocation not found" });
        }

        allocation.teacherId = teacherId;
        allocation.type = type || allocation.type; // Keep existing if not provided
        allocation.isClassIncharge = isClassIncharge !== undefined ? isClassIncharge : allocation.isClassIncharge;

        await allocation.save();

        if (allocation.type === 'Primary') {
            await Subject.findByIdAndUpdate(allocation.subjectId, { teacher: allocation.teacherId });
        }

        res.json({ message: "Allocation updated successfully", result: allocation });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { allocateSubjects, getTeacherWorkload, getClassAllocations, deleteAllocation, updateAllocation };
