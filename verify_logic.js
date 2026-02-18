const mongoose = require('mongoose');
const Student = require('./models/studentSchema');
const Family = require('./models/familySchema');
const Admin = require('./models/adminSchema'); // Assuming Admin model exists for school ref
const Sclass = require('./models/sclassSchema'); // Assuming Sclass model exists

// Mock Express Request/Response
const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.send = (data) => {
        res.data = data;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

// Import Controller Functions (We need to export them or mock them, but better to import)
// Since controller exports many functions, we can require the file.
const studentController = require('./controllers/student_controller');

async function runVerification() {
    console.log("Starting Verification...");
    try {
        const mongoUrl = "mongodb+srv://anaszafar1108_db_user:iXq7keo4UNGOeqV9@cluster0.fimv2qn.mongodb.net/?appName=Cluster0";
        await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });

        // Setup Dummy Data
        const admin = new Admin({ name: "Test Admin", email: "test@test.com", password: "123", schoolName: "Test School" });
        await admin.save();
        const sclass = new Sclass({ sclassName: "Class 1", school: admin._id });
        await sclass.save();

        const adminID = admin._id;
        const sclassID = sclass._id;

        // 1. Search Non-Existent Family
        console.log("\n1. Testing Search Non-Existent Family...");
        let req = { body: { cnic: "00000-0000000-0" } };
        let res = mockRes();
        await studentController.searchFamily(req, res);
        if (res.data.message === "Family not found") console.log("PASS: Correctly returned not found.");
        else console.log("FAIL: " + JSON.stringify(res.data));

        // 2. Register New Student (New Family)
        console.log("\n2. Testing Register New Student (New Family)...");
        req = {
            body: {
                name: "Ali",
                rollNum: 101,
                password: "123",
                sclassName: sclassID,
                adminID: adminID,
                dateOfBirth: new Date("2015-01-01"),
                gender: "Male",
                studentBForm: "11111-1111111-1",
                religion: "Muslim",
                familyDetails: {
                    fatherName: "Ahmed",
                    fatherCNIC: "11111-1111111-2",
                    fatherPhone: "03001234567",
                    homeAddress: "Street 1",
                    school: adminID
                }
            }
        };
        res = mockRes();
        await studentController.studentRegister(req, res);

        if (res.data && res.data._id && res.data.familyId) {
            console.log("PASS: Student created with Family ID: " + res.data.familyId);
            const family = await Family.findById(res.data.familyId);
            if (family && family.fatherName === "Ahmed") console.log("PASS: Family record created.");
            else console.log("FAIL: Family record mismatch.");
        } else {
            console.log("FAIL: " + JSON.stringify(res.data));
        }

        // 3. Search Existing Family
        console.log("\n3. Testing Search Existing Family...");
        req = { body: { cnic: "11111-1111111-2" } };
        res = mockRes();
        await studentController.searchFamily(req, res);
        if (res.data.message === "Family found" && res.data.family.fatherName === "Ahmed") {
            console.log("PASS: Found existing family.");
            var existingFamilyId = res.data.family._id;
        } else {
            console.log("FAIL: " + JSON.stringify(res.data));
        }

        // 4. Register Sibling (Existing Family)
        console.log("\n4. Testing Register Sibling (Existing Family)...");
        if (existingFamilyId) {
            req = {
                body: {
                    name: "Sara",
                    rollNum: 102,
                    password: "123",
                    sclassName: sclassID,
                    adminID: adminID,
                    dateOfBirth: new Date("2017-01-01"),
                    gender: "Female",
                    studentBForm: "11111-1111111-3",
                    religion: "Muslim",
                    familyId: existingFamilyId
                }
            };
            res = mockRes();
            await studentController.studentRegister(req, res);
            if (res.data._id && res.data.familyId.toString() === existingFamilyId.toString()) {
                console.log("PASS: Sibling created and linked to same family.");
                const updatedFamily = await Family.findById(existingFamilyId);
                if (updatedFamily.students.length === 2) console.log("PASS: Family record updated with 2 students.");
                else console.log("FAIL: Family student count mismatch: " + updatedFamily.students.length);
            } else {
                console.log("FAIL: " + JSON.stringify(res.data));
            }
        }

        // 5. Validation Test
        console.log("\n5. Testing CNIC Validation...");
        req = {
            body: {
                name: "Fail",
                rollNum: 103,
                password: "123",
                sclassName: sclassID,
                adminID: adminID,
                studentBForm: "InvalidFormat",
                familyDetails: {
                    fatherName: "FailDad",
                    fatherCNIC: "InvalidCNIC",
                    school: adminID
                }
            }
        };
        res = mockRes();
        await studentController.studentRegister(req, res);
        if (res.statusCode === 400) console.log("PASS: Validation failed as expected.");
        else console.log("FAIL: Should have failed but got: " + JSON.stringify(res.data));


    } catch (err) {
        console.error("Verification Error:", err);
    } finally {
        await mongoose.connection.close();
    }
}

runVerification();
