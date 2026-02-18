const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Subject = require("./models/subjectSchema");
const Teacher = require("./models/teacherSchema");
const Sclass = require("./models/sclassSchema");
const SubjectAllocation = require("./models/allocationSchema");
const Admin = require("./models/adminSchema");

dotenv.config();

const runVerification = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Connected to MongoDB for Verification");

        const school = await Admin.findOne();
        if (!school) {
            console.log("No school found. Please register an admin first.");
            return;
        }

        console.log("Creating Test Class and Subjects...");

        let sclass = await Sclass.findOne({ sclassName: "TestClass_Alloc_V2" });
        if (!sclass) {
            sclass = await new Sclass({ sclassName: "TestClass_Alloc_V2", school: school._id }).save();
        }

        let subject1 = await Subject.findOne({ subName: "TestPhysics_V2", sclassName: sclass._id });
        if (!subject1) {
            subject1 = await new Subject({
                subName: "TestPhysics_V2",
                subCode: "TPHY102",
                sessions: "5",
                sclassName: sclass._id,
                school: school._id
            }).save();
        }

        let teacher1 = await Teacher.findOne({ email: "test_teacher_alloc_v2@example.com" });
        if (!teacher1) {
            teacher1 = await new Teacher({
                name: "Test Teacher Alloc V2",
                email: "test_teacher_alloc_v2@example.com",
                password: "password123",
                school: school._id,
                role: "Teacher",
                phone: "1234567890",
                cnic: "1234567890123",
                qualification: "MSc Physics",
                designation: "Lecturer",
                joiningDate: new Date(),
                salary: 50000
            }).save();
        }

        console.log("Testing Allocation with new fields...");

        await SubjectAllocation.deleteMany({ subjectId: subject1._id, classId: sclass._id });

        // Attempt 1: Allocate subject1 to teacher1 as Class Incharge and Primary
        const allocation1 = new SubjectAllocation({
            teacherId: teacher1._id,
            classId: sclass._id,
            subjectId: subject1._id,
            academicYear: "2026",
            school: school._id,
            isClassIncharge: true,
            type: "Primary"
        });
        await allocation1.save();
        console.log("PASS: Allocated Subject 1 to Teacher 1 with isClassIncharge=true and type=Primary");

        // Verify fields
        const savedAlloc = await SubjectAllocation.findById(allocation1._id);
        if (savedAlloc.isClassIncharge === true && savedAlloc.type === "Primary") {
            console.log("PASS: Fields persisted correctly");
        } else {
            console.error("FAIL: Fields not persisted correctly", savedAlloc);
        }

        console.log("Verification Completed.");

    } catch (error) {
        console.error("Verification Error:", error);
    } finally {
        await mongoose.connection.close();
    }
};

runVerification();
