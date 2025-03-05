// routes/checker_history_api.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { checkSkiPassStation } = require('../scheduler');

const TABLE_CHECKER_CONTENT = "checker_content";

// Existing route to get checks
router.get('/get-checks', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from(TABLE_CHECKER_CONTENT)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching checks:', error);
            return res.status(500).json({ error: 'Error fetching check history' });
        }

        const formattedData = data.map(check => ({
            id: check.id,
            timestamp: check.created_at,
            httpCode: check.http_code,
            url: check.full_url,
            targetDate: check.target_date,
            price: check.price,
            hasContent: !!check.price
        }));

        res.json({
            success: true,
            checks: formattedData
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// New route to force a check
router.post('/force-check', async (req, res) => {
    try {
        console.log('Manual check requested...');
        const result = await checkSkiPassStation();

        if (result.error) {
            return res.status(500).json({
                success: false,
                message: 'Check failed',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: 'Check completed and stored',
            found: result.found,
            price: result.price
        });

    } catch (error) {
        console.error('Error during manual check:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

module.exports = router;