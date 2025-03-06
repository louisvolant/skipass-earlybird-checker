// routes/checker_history_api.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { checkSkiPassStation } = require('../service/skipass-resort-call');
const apicache = require('apicache');

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

router.get('/get-check-content', async (req, res) => {
    try {
        // Extract check_id from the query parameters
        const { check_id } = req.query;

        // Validate that check_id is provided
        if (!check_id) {
            return res.status(400).json({ error: 'Missing check_id parameter' });
        }

        // Query the Supabase database for the specific content using check_id
        const { data, error } = await supabase
            .from(TABLE_CHECKER_CONTENT)
            .select('*')
            .eq('id', check_id) // Use the 'id' column to filter by the provided check_id
            .single(); // Ensure that only a single row is returned

        // Handle possible database errors
        if (error) {
            console.error('Error fetching content:', error);
            return res.status(500).json({ error: 'Error retrieving content' });
        }

        // Check if data exists for the given check_id
        if (!data) {
            return res.status(404).json({ error: 'Content not found for the given check_id' });
        }

        // Send back the content in the response
        res.json({
            success: true,
            content: {
                id: data.id,
                timestamp: data.created_at,
                httpCode: data.http_code,
                url: data.full_url,
                targetDate: data.target_date,
                price: data.price,
                contentData: data.response_text || null,
            }
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

        // Clear the cache for get-checks
        apicache.clear('/api/get-checks');

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