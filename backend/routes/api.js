//routes/api.js

const express = require('express');
const router = express.Router();

router.use(require('./checker_history_api'));

module.exports = router;
