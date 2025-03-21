// routes/checker_history_api.js
const express = require('express');
const router = express.Router();
const { checkSkiPassStation } = require('../service/skipass-resort-call');
const { getCheckList, getCheckContent, deleteCheckContent } = require('../service/checker-history-service');
const { sendMail } = require('../service/mailer-service');

const apicache = require('apicache');

router.get('/get-checks', async (req, res) => {
  console.log('GET /api/get-checks called');
  try {
    const checkList = await getCheckList();
    console.log('Check list retrieved:', checkList.length, 'items');

    const formattedData = checkList.map(check => ({
      id: check.id,
      timestamp: check.created_at,
      httpCode: check.http_code,
      url: check.full_url,
      targetDate: check.target_date,
      targetLabel: check.target_label,
      price: check.price,
      hasContent: !!check.price,
    }));

    res.json({
      success: true,
      checks: formattedData,
    });
  } catch (error) {
    console.error('Error fetching checks:', error);
    res.status(500).json({ error: 'Error fetching check history' });
  }
});

router.get('/get-check-content', async (req, res) => {
  try {
    const { check_id } = req.query;

    if (!check_id) {
      return res.status(400).json({ error: 'Missing check_id parameter' });
    }

    const data = await getCheckContent(check_id);

    if (!data) {
      return res.status(404).json({ error: 'Content not found for the given check_id' });
    }

    res.json({
      success: true,
      content: {
        id: data.id,
        timestamp: data.created_at,
        httpCode: data.http_code,
        url: data.full_url,
        targetDate: data.target_date,
        targetLabel: data.target_label,
        price: data.price,
        contentData: data.response_text || null,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



router.post('/delete-check-content', async (req, res) => {
  try {
    const { check_id } = req.body;

    if (!check_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing check_id parameter'
      });
    }

    // Delete the check from the database
    const deleted = await deleteCheckContent(check_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Check not found'
      });
    }

    // Clear the cache if you're using apicache
    apicache.clear('/api/get-checks');

    res.json({
      success: true,
      message: 'Check deleted successfully',
      check_id: check_id
    });
  } catch (error) {
    console.error('Error deleting check:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.post('/force-check', async (req, res) => {
  try {
    console.log('Manual check requested...');
    const checkResults = await checkSkiPassStation();
    console.log('Check results obtained:', checkResults);

    const mailResult = await sendMail(checkResults);
    console.log('Mail sending completed:', mailResult);

    if (mailResult.error) {
      return res.status(500).json({
        success: false,
        message: 'Check failed',
        error: mailResult.error,
      });
    }

    apicache.clear('/api/get-checks');
    console.log('Cache cleared, sending response...');

    res.json({
      success: true,
      message: 'Check completed and stored',
      mailResult
    });
  } catch (error) {
    console.error('Error during manual check:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

module.exports = router;