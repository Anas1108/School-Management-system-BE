const mongoose = require('mongoose');
const Family = require('./models/familySchema');

async function test() {
    console.log("Connecting...");
    try {
        const mongoUrl = "mongodb+srv://anaszafar1108_db_user:iXq7keo4UNGOeqV9@cluster0.fimv2qn.mongodb.net/?appName=Cluster0";
        await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("Connected!");

        const count = await Family.countDocuments();
        console.log("Family count:", count);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

test();
