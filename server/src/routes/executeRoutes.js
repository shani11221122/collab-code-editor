const express = require('express');
const { executeCode } = require('../controllers/executeController');

const router = express.Router();
router.post('/', executeCode);

module.exports = router;