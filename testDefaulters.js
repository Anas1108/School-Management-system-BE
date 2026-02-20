const mongoose = require('mongoose');
const StudentInvoice = require('./models/studentInvoiceSchema');
const Student = require('./models/studentSchema');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log("Connected to DB");
        const classObj = await require('./models/sclassSchema').findOne();
        if (!classObj) return console.log("No class found");

        const classId = classObj._id;
        const defaulters = await StudentInvoice.aggregate([
            { $match: { classId: new mongoose.Types.ObjectId(classId) } },
            {
                $group: {
                    _id: "$studentId",
                    totalAmount: { $sum: "$totalAmount" },
                    totalLateFine: { $sum: "$lateFine" },
                    totalPaid: { $sum: "$paidAmount" },
                    invoices: { $push: "$$ROOT" }
                }
            },
            {
                $project: {
                    studentId: "$_id",
                    totalDue: { $subtract: [{ $add: ["$totalAmount", "$totalLateFine"] }, "$totalPaid"] },
                    totalPaid: 1
                }
            },
            { $match: { totalDue: { $gt: 0 } } } // Only show students with pending balance
        ]);

        const studentIds = defaulters.map(d => d.studentId);
        const students = await Student.find({ _id: { $in: studentIds } }, 'name rollNum');

        const result = defaulters.map(defaulter => {
            const student = students.find(s => s._id.toString() === defaulter.studentId.toString());
            return {
                ...defaulter,
                studentName: student ? student.name : 'Unknown',
                rollNum: student ? student.rollNum : 'N/A'
            };
        });
        console.log(JSON.stringify(result, null, 2));
        process.exit();
    })
    .catch(err => console.log(err));
