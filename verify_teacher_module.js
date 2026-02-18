const mongoose = require("mongoose");
const Teacher = require("./models/teacherSchema.js");
const Department = require("./models/departmentSchema.js");
const bcrypt = require("bcrypt");
require("dotenv").config(); // Load .env if not loaded manually in terminal, but since we run `node verify_teacher_module.js` we might need dotenv or just pass the string.

// Minimal script to verify logic without full express app
const verifyTeacherModule = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("Connected to MongoDB");

        // CLEANUP: Remove test data if exists
        const testEmail = "test_teacher_verify@example.com";
        await Teacher.deleteOne({ email: testEmail });
        await Department.deleteOne({ departmentName: "Test Department Logic" });

        // ARRANGE
        const teacherData = {
            name: "Test Teacher",
            email: testEmail,
            password: "password123",
            role: "Teacher",
            school: new mongoose.Types.ObjectId(), // Fake ID
            teachSubject: new mongoose.Types.ObjectId(), // Fake ID
            teachSclass: new mongoose.Types.ObjectId(), // Fake ID
            phone: "0300-1234567",
            cnic: "12345-1234567-1",
            qualification: "MPhil",
            designation: "Lecturer",
            department: "Test Department Logic", // Sending string to test controller logic simulation
            joiningDate: new Date(),
            salary: 50000,
            policeVerification: "No",
            subjectSpecialization: [], // Empty for now
            serviceBookNumber: "SB-123"
        };

        // ACT: Emulate Controller Logic for Department
        let departmentId = teacherData.department;
        if (teacherData.department && typeof teacherData.department === 'string') {
            console.log(`Checking department: ${teacherData.department}`);
            let dept = await Department.findOne({ departmentName: teacherData.department });
            if (!dept) {
                console.log("Department not found, creating new...");
                dept = new Department({ departmentName: teacherData.department });
                await dept.save();
                console.log(`Created Department ID: ${dept._id}`);
            } else {
                console.log(`Found Existing Department ID: ${dept._id}`);
            }
            departmentId = dept._id;
        }

        // Create Teacher Instance directly (to test pre-save hooks)
        const teacher = new Teacher({
            ...teacherData,
            department: departmentId
        });

        console.log("Saving teacher...");
        await teacher.save();
        console.log("Teacher saved successfully!");

        // ASSERT
        const savedTeacher = await Teacher.findOne({ email: testEmail }).populate("department");

        console.log("\n--- Verification Report ---");
        console.log(`Employee ID Generated: ${savedTeacher.employeeId} (Expected format: TEA-YYYY-XXX)`);

        const isPasswordHashed = await bcrypt.compare("password123", savedTeacher.password);
        console.log(`Password Hashing: ${isPasswordHashed ? "PASSED" : "FAILED"}`);

        console.log(`Department Linked: ${savedTeacher.department ? savedTeacher.department.departmentName : "FAILED"}`);

        if (savedTeacher.employeeId && isPasswordHashed && savedTeacher.department) {
            console.log("\n✅ ALL CHECKS PASSED");
        } else {
            console.log("\n❌ SOME CHECKS FAILED");
        }

    } catch (error) {
        console.error("Verification Error:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    }
};

verifyTeacherModule();
