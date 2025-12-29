const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardcontroller');

router.get('/stats', dashboardController.getStats);

module.exports = router;
