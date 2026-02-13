const mongoose = require('mongoose');
const dotenv = require("dotenv");
dotenv.config();

// We need to import the models so Mongoose knows about them
require('./models/studentSchema');
require('./models/studentInvoiceSchema');
require('./models/sclassSchema');

const { searchStudentsFees } = require('./controllers/fee-controller');

async function verifySearch() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const testStudent = await mongoose.model('student').findOne();
        if (!testStudent) {
            console.log("No students found in DB. Cannot verify.");
            return;
        }

        console.log(`Using Test Student: ${testStudent.name}, Roll: ${testStudent.rollNum}, School: ${testStudent.school}`);

        // Use req/res mocks
        const req = {
            query: {
                schoolId: testStudent.school.toString(),
                rollNum: testStudent.rollNum
            }
        };

        const res = {
            status: (code) => {
                console.log(`Response Status: ${code}`);
                return res;
            },
            send: (data) => {
                console.log("Search Results:", JSON.stringify(data, null, 2));
                return res;
            },
            json: (data) => {
                console.log("JSON Response:", JSON.stringify(data, null, 2));
                return res;
            }
        };

        console.log("Testing search by rollNum...");
        await searchStudentsFees(req, res);

        console.log("\nTesting search by classId...");
        const firstStudent = await mongoose.model('student').findOne();
        if (firstStudent) {
            req.query.rollNum = undefined;
            req.query.classId = firstStudent.sclassName;
            await searchStudentsFees(req, res);
        }

    } catch (error) {
        console.error("Verification failed:", error);
    } finally {
        await mongoose.connection.close();
    }
}

verifySearch();
