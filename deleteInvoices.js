const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Connected to MongoDB for script execution");
    } catch (err) {
        console.error("Error connecting to MongoDB:", err);
        process.exit(1);
    }
};

// Import the StudentInvoice model assuming it's in the models directory
const StudentInvoice = require('./models/studentInvoiceSchema');

const deleteAllInvoices = async () => {
    await connectDB();
    try {
        console.log("Preparing to delete all invoices...");

        // Find existing invoices count
        const count = await StudentInvoice.countDocuments();
        console.log(`Found ${count} invoices in the database.`);

        if (count === 0) {
            console.log("No invoices found to delete.");
            process.exit(0);
        }

        // Delete all invoices
        const result = await StudentInvoice.deleteMany({});
        console.log(`Successfully deleted ${result.deletedCount} invoices.`);

    } catch (error) {
        console.error("An error occurred while deleting invoices:", error);
    } finally {
        // Close the database connection
        mongoose.connection.close();
        console.log("Database connection closed.");
    }
};

// Execute the clear function
deleteAllInvoices();
