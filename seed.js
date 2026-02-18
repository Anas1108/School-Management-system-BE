const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const Admin = require('./models/adminSchema');
const Teacher = require('./models/teacherSchema');
const Student = require('./models/studentSchema');
const Subject = require('./models/subjectSchema');
const Sclass = require('./models/sclassSchema');
const Allocation = require('./models/allocationSchema');
const Family = require('./models/familySchema');

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

mongoose.connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => {
        console.log("Connected to MongoDB for Seeding");
        seedData();
    })
    .catch((err) => {
        console.log("Error connecting to DB:", err);
    });

// Helper to get random item from array
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper to generate random number string
const getRandomNumberString = (length) => {
    let result = '';
    const characters = '0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

// Data Collections (Pakistani Context)
const firstNamesMale = ["Ahmed", "Ali", "Bilal", "Danish", "Fahad", "Hamza", "Hassan", "Imran", "Junaid", "Kashif", "Mohsin", "Noman", "Omar", "Osman", "Qasim", "Rizwan", "Saad", "Salman", "Taimoor", "Usman", "Waqas", "Zain", "Adeel", "Babar", "Faisal", "Haris", "Ibrar", "Javed", "Kamran", "Nasir", "Raheel", "Sohail", "Tanveer", "Umair", "Yasir", "Zahoor"];
const firstNamesFemale = ["Aisha", "Amna", "Bushra", "Fatima", "Hina", "Irum", "Komal", "Maria", "Nida", "Rabia", "Sadia", "Sana", "Sidra", "Uzma", "Zainab", "Zoya", "Mehwish", "Sobia", "Nazia", "Farheen", "Anum", "Beenish", "Fariha", "Ghazala", "Hira", "Javeria", "Kiran", "Mahnoor", "Noreen", "Parveen", "Quratulain", "Rimsha", "Samina", "Tehreem", "Urwa", "Yumna"];
const lastNames = ["Khan", "Ahmed", "Ali", "Shah", "Butt", "Shaikh", "Jatt", "Chaudhary", "Malik", "Qureshi", "Rehman", "Siddiqui", "Ansari", "Baig", "Lodhi", "Mirza", "Raja", "Rana", "Bhatti", "Cheema", "Dogar", "Ghumman", "Jan", "Khawaja", "Mughal", "Niazi", "Paracha", "Qadri", "Rashid", "Satti", "Tarin", "Virk", "Waraich", "Yousafzai", "Zaidi"];

const subjectsList = [
    { name: "Mathematics", code: "MATH", marks: 100 },
    { name: "English", code: "ENG", marks: 100 },
    { name: "Urdu", code: "URDU", marks: 100 },
    { name: "General Science", code: "GSCI", marks: 100 },
    { name: "Islamiyat", code: "ISL", marks: 50 },
    { name: "Social Studies", code: "SST", marks: 50 },
    { name: "Computer Science", code: "CS", marks: 100 },
    { name: "Physics", code: "PHY", marks: 100 },
    { name: "Chemistry", code: "CHEM", marks: 100 },
    { name: "Biology", code: "BIO", marks: 100 },
    { name: "Pakistan Studies", code: "PST", marks: 50 },
    { name: "Arts", code: "ARTS", marks: 50 },
    { name: "Arabic", code: "ARB", marks: 50 },
    { name: "Economics", code: "ECO", marks: 100 },
    { name: "Statistics", code: "STAT", marks: 100 },
    { name: "Civics", code: "CIV", marks: 100 },
    { name: "Education", code: "EDU", marks: 100 }
];

const classNames = ["Nursery", "Prep", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];

const seedData = async () => {
    try {
        // 1. Find Admin (School)
        const admin = await Admin.findOne();
        if (!admin) {
            console.log("No Admin found! Please create an admin first.");
            process.exit(1);
        }
        const schoolId = admin._id;
        console.log(`Seeding data for School: ${admin.schoolName || 'Admin School'}`);

        // 2. Create Classes
        console.log("Seeding Classes...");
        const createdClasses = [];
        for (const className of classNames) {
            let sclass = await Sclass.findOne({ sclassName: className, school: schoolId });
            if (!sclass) {
                sclass = await Sclass.create({ sclassName: className, school: schoolId });
            }
            createdClasses.push(sclass);
        }
        console.log(`Ensured ${createdClasses.length} classes exist.`);

        // 3. Create Teachers
        console.log("Seeding Teachers...");
        const createdTeachers = [];
        // Create 25 Teachers
        for (let i = 0; i < 25; i++) {
            const isMale = Math.random() > 0.5;
            const firstName = getRandom(isMale ? firstNamesMale : firstNamesFemale);
            const lastName = getRandom(lastNames);
            const name = `${firstName} ${lastName}`;
            const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${getRandomNumberString(3)}@example.com`;

            // Check if email exists
            const existingTeacher = await Teacher.findOne({ email });
            if (existingTeacher) {
                createdTeachers.push(existingTeacher);
                continue;
            }

            const teacher = new Teacher({
                name,
                email,
                password: "password123", // Will be hashed by pre-save hook
                school: schoolId,
                role: "Teacher",
                phone: `03${getRandomNumberString(9)}`,
                cnic: `${getRandomNumberString(5)}-${getRandomNumberString(7)}-${getRandomNumberString(1)}`,
                qualification: getRandom(["M.Sc", "B.Ed", "M.A", "BS CS", "M.Phil", "Ph.D"]),
                designation: getRandom(["Senior Teacher", "Junior Teacher", "Lecturer", "Professor"]),
                joiningDate: new Date(),
                salary: 50000 + Math.floor(Math.random() * 50000),
                policeVerification: 'Yes',
            });
            await teacher.save();
            createdTeachers.push(teacher);
        }
        console.log(`Ensured ${createdTeachers.length} teachers exist.`);

        // 4. Create Subjects & Allocations
        console.log("Seeding Subjects and Allocations...");

        for (const sclass of createdClasses) {
            // Determine subjects based on class level
            let classSubjects = [];
            const className = sclass.sclassName;

            if (className === "Nursery" || className === "Prep") {
                classSubjects = subjectsList.filter(s => ["English", "Urdu", "Arts", "Mathematics"].includes(s.name));
            } else if (className.includes("11") || className.includes("12")) {
                // College level - mixture of Sci/Arts
                classSubjects = subjectsList.filter(s => ["Physics", "Chemistry", "Biology", "Mathematics", "English", "Urdu", "Pakistan Studies", "Economics", "Statistics", "Computer Science"].includes(s.name));
            } else if (className.includes("9") || className.includes("10")) {
                classSubjects = subjectsList.filter(s => ["Physics", "Chemistry", "Biology", "Mathematics", "English", "Urdu", "Pakistan Studies", "Islamiyat", "Computer Science"].includes(s.name));
            } else if (parseInt(className.replace("Class ", "")) >= 6) {
                classSubjects = subjectsList.filter(s => !["Physics", "Chemistry", "Biology", "Economics", "Statistics"].includes(s.name));
            } else {
                classSubjects = subjectsList.filter(s => ["Mathematics", "English", "Urdu", "General Science", "Islamiyat", "Arts", "Social Studies"].includes(s.name));
            }

            for (const subTemplate of classSubjects) {
                // Find or Create Subject for this Class
                let subject = await Subject.findOne({
                    subName: subTemplate.name,
                    sclassName: sclass._id,
                    school: schoolId
                });

                if (!subject) {
                    subject = await Subject.create({
                        subName: subTemplate.name,
                        subCode: `${subTemplate.code}-${className.replace("Class ", "").replace("Nursery", "NUR").replace("Prep", "PREP")}`,
                        totalMarks: subTemplate.marks,
                        passMarks: Math.floor(subTemplate.marks * 0.33),
                        sessions: "2024-2025",
                        sclassName: sclass._id,
                        school: schoolId
                    });
                }

                // Allocate variable teacher
                const teacher = getRandom(createdTeachers);

                // Check if allocation exists
                const existingAllocation = await Allocation.findOne({
                    classId: sclass._id,
                    subjectId: subject._id,
                    academicYear: "2024-2025",
                    school: schoolId
                });

                if (!existingAllocation) {
                    await Allocation.create({
                        teacherId: teacher._id,
                        classId: sclass._id,
                        subjectId: subject._id,
                        academicYear: "2024-2025",
                        isClassIncharge: subTemplate.name === "Mathematics", // Math teacher is incharge
                        type: "Primary",
                        school: schoolId
                    });
                }
            }
        }
        console.log("Subjects and Allocations seeded.");

        // 5. Create Families and Students
        console.log("Seeding Families and Students...");

        // Hash password for students (if no pre-save hook)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("password123", salt);

        // Create 50 Families
        for (let i = 0; i < 50; i++) {
            const fatherName = `${getRandom(firstNamesMale)} ${getRandom(lastNames)}`;
            const cnic = `${getRandomNumberString(5)}-${getRandomNumberString(7)}-${getRandomNumberString(1)}`;

            let family = await Family.findOne({ fatherCNIC: cnic });
            if (!family) {
                family = await Family.create({
                    fatherName: fatherName,
                    fatherCNIC: cnic,
                    fatherPhone: `03${getRandomNumberString(9)}`,
                    fatherOccupation: getRandom(["Engineer", "Doctor", "Teacher", "Businessman", "Driver", "Shopkeeper", "Civil Servant", "Lawyer", "Farmer"]),
                    motherName: `${getRandom(firstNamesFemale)} ${getRandom(lastNames)}`,
                    homeAddress: `House ${getRandomNumberString(3)}, Street ${getRandomNumberString(2)}, Sector ${getRandom(["F-6", "G-10", "I-8", "H-13", "DHA Phase 2", "Bahria Town"])}`,
                    school: schoolId
                });
            }

            // Create 1-3 students for this family
            const numStudents = Math.floor(Math.random() * 3) + 1;
            for (let j = 0; j < numStudents; j++) {
                const sclass = getRandom(createdClasses);
                const isMale = Math.random() > 0.5;
                const firstName = getRandom(isMale ? firstNamesMale : firstNamesFemale);
                const studentName = `${firstName} ${fatherName.split(" ").pop()}`; // use father's last name
                const bform = `${getRandomNumberString(5)}-${getRandomNumberString(7)}-${getRandomNumberString(1)}`;

                const existingStudent = await Student.findOne({ studentBForm: bform });
                if (existingStudent) continue;

                const student = await Student.create({
                    name: studentName,
                    rollNum: parseInt(getRandomNumberString(4)),
                    password: hashedPassword,
                    sclassName: sclass._id,
                    school: schoolId,
                    role: "Student",
                    dateOfBirth: new Date(2005 + Math.floor(Math.random() * 15), 0, 1),
                    gender: isMale ? "Male" : "Female",
                    studentBForm: bform,
                    admissionDate: new Date(),
                    religion: "Muslim", // Majority context
                    familyId: family._id,
                    bloodGroup: getRandom(["A+", "B+", "O+", "AB+", "A-", "O-"])
                });

                // Link student to family
                family.students.push(student._id);
            }
            await family.save();
        }
        console.log("Families and Students seeded.");

        console.log("Database Population Completed Successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Seeding Failed:", error);
        process.exit(1);
    }
};
