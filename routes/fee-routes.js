const express = require('express');
const router = express.Router();
const {
    createFeeHead,
    getFeeHeads,
    createFeeStructure,
    getFeeStructure,
    generateInvoices,
    getInvoices,
    payInvoice,
    getFeeStats,
    getStudentFeeHistory
} = require('../controllers/fee-controller');

// Fee Head
router.post('/FeeHeadCreate', createFeeHead);
router.get('/FeeHeads/:id', getFeeHeads); // :id = schoolId

// Fee Structure
router.post('/FeeStructureCreate', createFeeStructure);
router.get('/FeeStructure/:id', getFeeStructure); // :id = classId

// Invoices
router.post('/FeeInvoiceGenerate', generateInvoices);
router.get('/FeeInvoices/:id', getInvoices); // :id = classId
router.put('/FeeInvoicePay/:id', payInvoice); // :id = invoiceId

// Stats
router.get('/FeeStats/:id', getFeeStats); // :id = schoolId (pass ?month=X&year=Y)

// Student Fee History
router.get('/FeeHistory/:id', getStudentFeeHistory); // :id = studentId

// Fee Defaulters Grouped
router.get('/FeeDefaulters/:id', require('../controllers/fee-controller').getDefaultersByClass); // :id = classId

module.exports = router;
