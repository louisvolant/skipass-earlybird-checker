const axios = require('axios');
const htmlparser2 = require('htmlparser2');
const { getActiveConfigurations } = require('../service/checker-configuration-service');
const { saveCheckContent } = require('../service/checker-history-service');

const url = process.env.BASE_SKI_RESORT_URL;
const searchUrl = process.env.BASE_SKI_RESORT_URL_SHOP;
const https = require('https');

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

    let productRows = [];
    let currentProductRow = null;
    let currentLinkText = '';
    let currentButtonText = '';
    let insideProductRow = false;
    let insideLink = false;
    let insideButton = false;

    const parser = new htmlparser2.Parser({
      onopentag(name, attribs) {
        if (attribs.class?.includes('product-row')) {
          insideProductRow = true;
          currentProductRow = { linkText: '', buttonText: '' };
        }
        if (insideProductRow && name === 'a' && attribs.class?.includes('product-row__link')) {
          insideLink = true;
          currentLinkText = '';
        }
        if (insideProductRow && attribs.class?.includes('button__text')) {
          insideButton = true;
          currentButtonText = '';
        }
      },
      ontext(text) {
        const trimmedText = text.trim();
        if (insideLink && trimmedText) {
          currentLinkText += trimmedText;
          console.log(`Link Text: ${currentLinkText}`);
        }
        if (insideButton && trimmedText) {
          currentButtonText += trimmedText;
          console.log(`Button Text: ${currentButtonText}`);
        }
      },
      onclosetag(name) {
        if (insideProductRow && name === 'a' && insideLink) {
          insideLink = false;
          if (currentProductRow) currentProductRow.linkText = currentLinkText.trim();
        }
        if (insideProductRow && name === 'span' && insideButton) {
          insideButton = false;
          if (currentProductRow) currentProductRow.buttonText = currentButtonText.trim();
        }
        if (name === 'div' && insideProductRow && !insideLink && !insideButton) {
          const classes = parser._tokenizer._attributes?.class || '';
          if (classes.includes('product-row')) {
            insideProductRow = false;
            if (currentProductRow && currentProductRow.linkText && currentProductRow.buttonText) {
              productRows.push(currentProductRow);
            }
            currentProductRow = null;
          }
        }
      },
    });

    console.log(`Response data length: ${response.data.length}`);
    parser.write(response.data);
    parser.end();
    console.log('Parsed product rows:', productRows);

    const fullUrl = `${searchUrl}?partner_date=${dateToCheck}&start_date=${dateToCheck}`;
    const productRow = productRows.find(
      (row) => row.linkText.toLowerCase().trim() === searchTerm.toLowerCase().trim()
    );

    if (productRow) {
      console.log(`[${new Date().toISOString()}] "${searchTerm}" found for date ${dateToCheck}!`);
      console.log(`Raw buttonText: "${productRow.buttonText}"`);

      // Improved price extraction
      const priceMatch = productRow.buttonText.match(/€(\d+(?:[.,]\d{1,2})?)/);
      let price = null;
      if (priceMatch) {
        // Replace comma with dot for consistent parsing, then convert to float
        price = parseFloat(priceMatch[1].replace(',', '.'));
        console.log(`Extracted Price: €${price}`);
      } else {
        console.warn(`Price not found in buttonText: "${productRow.buttonText}"`);
      }

      await saveCheckContent(response.status.toString(), fullUrl, dateToCheck, searchTerm, price, response.data);
      return { found: true, price };
    } else {
      console.log(`[${new Date().toISOString()}] "${searchTerm}" not found in product rows for date ${dateToCheck}.`);
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