// service/skipass-resort-call.js
const axios = require('axios');
const cheerio = require('cheerio');
const whatwgMimetype = require('whatwg-mimetype');
const { getActiveConfigurations } = require('../service/checker-configuration-service');
const { saveCheckContent } = require('../service/checker-history-service');

const url = process.env.BASE_SKI_RESORT_URL;
const searchUrl = process.env.BASE_SKI_RESORT_URL_SHOP;
const https = require('https');
console.log('whatwg-mimetype:', whatwgMimetype);

async function performCheckForConfig(config) {
  const { target_date: dateToCheck, target_label: searchTerm } = config;
  const custom_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
    'Referer': url,
    'Cookie': '_rtopia_session_id=pKoDOrCTABGbEcq7aSlO0K8ZDTABGbEcq7a; __stripe_mid=bfd1450a-ce8d-4662-8628-af786988fdaf; __stripe_sid=8ce2e24f-06b6-486c-ab38-4edd88c17e44',
  };

  try {
    const response = await axios.get(searchUrl, {
      params: { partner_date: dateToCheck, start_date: dateToCheck },
      headers: custom_headers,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });

    const $ = cheerio.load(response.data);
    const bodyText = $('body').text().toLowerCase();
    const found = bodyText.includes(searchTerm.toLowerCase());
    const fullUrl = `${searchUrl}?partner_date=${dateToCheck}&start_date=${dateToCheck}`;

    if (found) {
      console.log(`[${new Date().toISOString()}] "${searchTerm}" found for date ${dateToCheck}!`);
      const productRow = $('.product-row')
        .filter((i, el) => $(el).find('.product-row__link').text().trim().toLowerCase() === searchTerm.toLowerCase())
        .first();

      let price = null;
      if (productRow.length) {
        const priceElement = productRow.find('.product-row__button .button__text').text().trim();
        const priceMatch = priceElement.match(/€[\d.]+/);
        price = priceMatch ? parseFloat(priceMatch[0].replace('€', '')) : null;
      }

      await saveCheckContent(response.status.toString(), fullUrl, dateToCheck, searchTerm, price, response.data);
      return { found: true, price };
    } else {
      console.log(`[${new Date().toISOString()}] "${searchTerm}" not found for date ${dateToCheck}.`);
      await saveCheckContent(response.status.toString(), fullUrl, dateToCheck, searchTerm, null, response.data);
      return { found: false, price: null };
    }
  } catch (error) {
    console.error(`Error during check for date ${dateToCheck} and label ${searchTerm}:`, error);
    const fullUrl = `${searchUrl}?partner_date=${dateToCheck}&start_date=${dateToCheck}`;
    await saveCheckContent(error.response?.status?.toString() || 'unknown', fullUrl, dateToCheck, searchTerm, null, error.message);
    return { found: false, price: null, error: error.message };
  }
}

async function checkSkiPassStation() {
  try {
    const configurations = await getActiveConfigurations();
    if (configurations.length === 0) {
      console.log('No active configurations found.');
      return [];
    }

    const results = await Promise.all(
      configurations.map(async (config) => {
        console.log(`Running check for target_date: ${config.target_date}, target_label: ${config.target_label}`);
        const result = await performCheckForConfig(config);
        return {
          configId: config.id,
          target_date: config.target_date,
          target_label: config.target_label,
          is_mail_alert: config.is_mail_alert,
          mail_alert_address: config.mail_alert_address,
          mail_alert_contact: config.mail_alert_contact,
          ...result,
        };
      })
    );

    return results;
  } catch (error) {
    console.error('Error in checkSkiPassStation:', error);
    throw error;
  }
}

module.exports = { checkSkiPassStation };