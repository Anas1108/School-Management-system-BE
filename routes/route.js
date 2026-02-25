const router = require('express').Router();

// const { adminRegister, adminLogIn, deleteAdmin, getAdminDetail, updateAdmin } = require('../controllers/admin-controller.js');

const { adminRegister, adminLogIn, getAdminDetail, updateAdmin } = require('../controllers/admin-controller.js');

const { sclassCreate, sclassList, deleteSclass, deleteSclasses, getSclassDetail, getSclassStudents, updateSclass, assignClassTeacher, removeClassTeacher, getClassTeachers } = require('../controllers/class-controller.js');
const { complainCreate, complainList, complainUpdate, complainListByUser, complainDelete } = require('../controllers/complain-controller.js');
const { noticeCreate, noticeList, deleteNotices, deleteNotice, updateNotice, getNoticeDetail } = require('../controllers/notice-controller.js');
const {
    studentRegister,
    studentLogIn,
    getStudents,
    getStudentDetail,
    deleteStudents,
    deleteStudent,
    updateStudent,
    deleteStudentsByClass,
    updateExamResult,
    searchFamily,
    getAllFamilies,
    getFamilyDetails,
    familyCreate,
    updateFamily,
    deleteFamily,
    promoteStudents
} = require('../controllers/student_controller.js');
const { subjectCreate, classSubjects, deleteSubjectsByClass, getSubjectDetail, deleteSubject, freeSubjectList, allSubjects, deleteSubjects, updateSubject } = require('../controllers/subject-controller.js');
const { teacherRegister, teacherLogIn, getTeachers, getTeacherDetail, deleteTeachers, deleteTeachersByClass, deleteTeacher, updateTeacherSubject, updateTeacher } = require('../controllers/teacher-controller.js');
const { presetCreate, presetList, deletePreset } = require('../controllers/lastBalancePreset-controller.js');

// Admin
router.post('/AdminReg', adminRegister);
router.post('/AdminLogin', adminLogIn);

router.get("/Admin/:id", getAdminDetail)
// router.delete("/Admin/:id", deleteAdmin)

router.put("/Admin/:id", updateAdmin)

// Student

router.post('/StudentReg', studentRegister);
router.post('/SearchFamily', searchFamily); // New Route
router.post('/StudentLogin', studentLogIn)

router.get("/Students/:id", getStudents)
router.get("/Student/:id", getStudentDetail)

router.get("/Families/:id", getAllFamilies)
router.get("/Family/:id", getFamilyDetails)
router.post("/FamilyCreate", familyCreate)
router.put("/Family/:id", updateFamily)
router.delete("/Family/:id", deleteFamily)

router.delete("/Students/:id", deleteStudents)
router.delete("/StudentsClass/:id", deleteStudentsByClass)
router.delete("/Student/:id", deleteStudent)

router.put("/Student/:id", updateStudent)

router.put('/Students/Promote', promoteStudents)

router.put('/UpdateExamResult/:id', updateExamResult)

// Teacher

router.post('/TeacherReg', teacherRegister);
router.post('/TeacherLogin', teacherLogIn)

router.get("/Teachers/:id", getTeachers)
router.get("/Teacher/:id", getTeacherDetail)

router.delete("/Teachers/:id", deleteTeachers)
router.delete("/TeachersClass/:id", deleteTeachersByClass)
router.delete("/Teacher/:id", deleteTeacher)

router.put("/TeacherSubject", updateTeacherSubject)

router.put("/Teacher/:id", updateTeacher)

// Notice

router.post('/NoticeCreate', noticeCreate);

router.get('/NoticeList/:id', noticeList);

router.delete("/Notices/:id", deleteNotices)
router.delete("/Notice/:id", deleteNotice)

router.get("/Notice/:id", getNoticeDetail)

router.put("/Notice/:id", updateNotice)

// Complain

router.post('/ComplainCreate', complainCreate);

router.put('/ComplainUpdate/:id', complainUpdate);

router.delete('/ComplainDelete/:id', complainDelete);

router.get('/ComplainList/:id', complainList);
router.get('/ComplainListByUser/:id', complainListByUser);

// Sclass

router.post('/SclassCreate', sclassCreate);

router.get('/SclassList/:id', sclassList);
router.get("/Sclass/:id", getSclassDetail)
router.put("/Sclass/:id", updateSclass)

router.get("/Sclass/Students/:id", getSclassStudents)

router.put("/SclassTeacher/:id", assignClassTeacher)
router.put("/RemoveSclassTeacher/:id", removeClassTeacher)
router.get("/getClassTeachers/:id", getClassTeachers)

router.delete("/Sclasses/:id", deleteSclasses)
router.delete("/Sclass/:id", deleteSclass)

// Subject

router.post('/SubjectCreate', subjectCreate);

router.get('/AllSubjects/:id', allSubjects);
router.get('/ClassSubjects/:id', classSubjects);
router.get('/FreeSubjectList/:id', freeSubjectList);
router.get("/Subject/:id", getSubjectDetail)
router.put("/Subject/:id", updateSubject)

router.delete("/Subject/:id", deleteSubject)
router.delete("/Subjects/:id", deleteSubjects)
router.delete("/SubjectsClass/:id", deleteSubjectsByClass)

// Subject Allocation
// Subject Allocation
const { allocateSubjects, getTeacherWorkload, getClassAllocations, deleteAllocation, updateAllocation } = require('../controllers/allocation-controller.js');
router.post('/SubjectAllocation', allocateSubjects);
router.get('/TeacherWorkload/:id', getTeacherWorkload);
router.get('/ClassAllocations/:id', getClassAllocations);
router.delete('/SubjectAllocation/:id', deleteAllocation);
router.put('/SubjectAllocation/:id', updateAllocation);

// Last Balance Presets
router.post('/LastBalancePresetCreate', presetCreate);
router.get('/LastBalancePresets/:id', presetList);
router.delete('/LastBalancePreset/:id', deletePreset);

module.exports = router;