require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URL)
    .then(async () => {
        try {
            await mongoose.connection.collection('students').dropIndex('studentBForm_1');
            console.log('Index studentBForm_1 dropped successfully.');

            // Let Mongoose recreate the indexes based on the current schema (which has sparse: true)
            const Student = require('./models/studentSchema');
            await Student.syncIndexes();
            console.log('Indexes synced successfully.');
        } catch (e) {
            console.log('Error:', e.message);
        }
        process.exit(0);
    });
