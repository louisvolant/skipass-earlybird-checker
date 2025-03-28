//routes/api.js

const express = require('express');
const router = express.Router();

router.use(require('./checker_history_api'));
router.use(require('./checker_configuration_api'));
router.use(require('./db_usage_api'));
router.use(require('./mailer_api'));

module.exports = router;
