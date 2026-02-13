const mongoose = require('mongoose');
const Student = require('./models/studentSchema');
const StudentInvoice = require('./models/studentInvoiceSchema');
const FeeStructure = require('./models/feeStructureSchema');
// Need these models registered mostly.
const dotenv = require("dotenv");
dotenv.config();

const { getStudentFeeHistory } = require('./controllers/fee-controller');

// Mock req, res
const req = {
    params: { id: '' }
};

const res = {
    status: function (code) {
        console.log(`Status: ${code}`);
        return this;
    },
    json: function (data) {
        console.log("JSON Response:", JSON.stringify(data, null, 2));
        return this;
    },
    send: function (data) {
        console.log("SEND Response:", JSON.stringify(data, null, 2));
        return this;
    }
};

async function runTest() {
    try {
        await mongoose.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Connected to MongoDB");

        // 1. Get a random student
        const student = await Student.findOne();
        if (!student) {
            console.log("No students found in DB.");
            process.exit();
        }

        console.log(`Testing with Student: ${student.name} (${student._id})`);
        req.params.id = student._id;

        // 2. Call the controller function
        await getStudentFeeHistory(req, res);

    } catch (error) {
        console.error("Test Error:", error);
    } finally {
        await mongoose.connection.close();
    }
}

runTest();
