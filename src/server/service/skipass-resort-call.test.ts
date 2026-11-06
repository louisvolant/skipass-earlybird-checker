import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as htmlparser2 from 'htmlparser2';

describe('HTML Parser Service (htmlparser2 v12)', () => {
  it('should parse resort product rows and extract link and button texts', () => {
    const sampleHtml = `
      <div class="product-row">
        <a class="product-row__link" href="/deal-1">
          Pass Saison EarlyBird 2026/2027
        </a>
        <div class="product-action">
          <span class="button__text">Acheter 399€</span>
        </div>
      </div>
      <div class="product-row">
        <a class="product-row__link" href="/deal-2">
          Pass Journée
        </a>
        <div class="product-action">
          <span class="button__text">Acheter 59€</span>
        </div>
      </div>
    `;

    const productRows: { linkText: string; buttonText: string }[] = [];
    let currentProductRow: { linkText: string; buttonText: string } | null = null;
    let currentLinkText = '';
    let currentButtonText = '';
    let insideProductRow = false;
    let insideLink = false;
    let insideButton = false;

    const parser = new htmlparser2.Parser({
      onopentag(name, attribs) {
        if (attribs.class?.includes('product-row') && !insideProductRow) {
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
        if (insideLink && trimmedText) currentLinkText += trimmedText;
        if (insideButton && trimmedText) currentButtonText += trimmedText;
      },
      onclosetag(name) {
        if (insideProductRow && name === 'a' && insideLink) {
          insideLink = false;
          if (currentProductRow) {
            currentProductRow.linkText = currentLinkText.trim();
          }
        }
        if (insideProductRow && name === 'span' && insideButton) {
          insideButton = false;
          if (currentProductRow) {
            currentProductRow.buttonText = currentButtonText.trim();
            if (currentProductRow.linkText && currentProductRow.buttonText) {
              productRows.push(currentProductRow);
              insideProductRow = false;
            }
          }
        }
      },
    });

    parser.write(sampleHtml);
    parser.end();

    assert.strictEqual(productRows.length, 2, 'should extract exactly two product rows');
    assert.strictEqual(productRows[0].linkText, 'Pass Saison EarlyBird 2026/2027');
    assert.strictEqual(productRows[0].buttonText, 'Acheter 399€');
    assert.strictEqual(productRows[1].linkText, 'Pass Journée');
    assert.strictEqual(productRows[1].buttonText, 'Acheter 59€');
  });
});
