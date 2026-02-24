const express = require('express');
const router = express.Router();
const {
    createDiscountGroup,
    getDiscountGroups,
    updateDiscountGroup,
    deleteDiscountGroup,
    assignStudentDiscount,
    getStudentDiscounts,
    removeStudentDiscount
} = require('../controllers/discount-controller');

// Discount Groups (Admin manages these)
router.post('/DiscountGroupCreate', createDiscountGroup);
router.get('/DiscountGroups/:id', getDiscountGroups); // :id = schoolId
router.put('/DiscountGroupUpdate/:id', updateDiscountGroup); // :id = groupId
router.delete('/DiscountGroupDelete/:id', deleteDiscountGroup); // :id = groupId

// Student Discounts
router.post('/StudentDiscountAssign', assignStudentDiscount);
router.get('/StudentDiscounts/:id', getStudentDiscounts); // :id = studentId
router.delete('/StudentDiscountRemove/:id', removeStudentDiscount); // :id = assignmentId

module.exports = router;
