// scheduler.js
const cron = require('node-cron');
const axios = require('axios');
const cheerio = require('cheerio');
const supabase = require('./config/supabase');

// Configuration
const url = process.env.BASE_SKI_RESORT_URL;
const searchUrl = process.env.BASE_SKI_RESORT_URL_SHOP;
const dateToCheck = process.env.TARGET_DATE;
const searchTerm = process.env.TARGET_LABEL;

const TABLE_CHECKER_CONTENT = "checker_content";

// Export this function so it can be used elsewhere
async function checkSkiPassStation() {

  const custom_headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36', // Custom User-Agent
      'Referer': url,
      'Cookie': '_rtopia_session_id=pKoDOrCTABGbEcq7aSlO0K8ZDTABGbEcq7a; __stripe_mid=bfd1450a-ce8d-4662-8628-af786988fdaf; __stripe_sid=8ce2e24f-06b6-486c-ab38-4edd88c17e44',
  };

    try {
        const response = await axios.get(searchUrl, {
            params: {
                partner_date: dateToCheck,
                start_date: dateToCheck
            },
            headers: custom_headers
        });

        const $ = cheerio.load(response.data);
        const found = $('body').text().includes(searchTerm);
        const fullUrl = `${searchUrl}?partner_date=${dateToCheck}&start_date=${dateToCheck}`;

        if (found) {
            console.log(`[${new Date().toISOString()}] "${searchTerm}" found!`);

            const priceElement = $('.product-row__button .button__text').text();
            const priceMatch = priceElement.match(/€[\d.]+/);
            const price = priceMatch ? parseFloat(priceMatch[0].replace('€', '')) : null;

            const { error } = await supabase
                .from(TABLE_CHECKER_CONTENT)
                .insert({
                    created_at: new Date().toISOString(),
                    http_code: response.status.toString(),
                    full_url: fullUrl,
                    target_date: dateToCheck,
                    price: price,
                    response_text: response.data
                });

            if (error) {
                console.error('Error saving successful check:', error);
            }
            return { found: true, price: price }; // Return result
        } else {
            console.log(`[${new Date().toISOString()}] "${searchTerm}" not found.`);

            const { error } = await supabase
                .from(TABLE_CHECKER_CONTENT)
                .insert({
                    created_at: new Date().toISOString(),
                    http_code: response.status.toString(),
                    full_url: fullUrl,
                    target_date: dateToCheck,
                    price: null,
                    response_text: response.data
                });

            if (error) {
                console.error('Error saving unsuccessful check:', error);
            }
            return { found: false, price: null }; // Return result
        }

    } catch (error) {
        console.error('Error during check:', error);

        const fullUrl = `${searchUrl}?partner_date=${dateToCheck}&start_date=${dateToCheck}`;
        const { error: dbError } = await supabase
            .from(TABLE_CHECKER_CONTENT)
            .insert({
                created_at: new Date().toISOString(),
                http_code: error.response?.status?.toString() || 'unknown',
                full_url: fullUrl,
                target_date: dateToCheck,
                price: null,
                response_text: error.message
            });

        if (dbError) {
            console.error('Error saving error case:', dbError);
        }
        return { found: false, price: null, error: error.message }; // Return result with error
    }
}

// Schedule the task (every 6 hours)
cron.schedule('0 */6 * * *', () => {
    console.log('Starting scheduled check...');
    checkSkiPassStation();
});

console.log('Application started. Check scheduled every 6 hours.');

module.exports = { checkSkiPassStation }; // Export the function