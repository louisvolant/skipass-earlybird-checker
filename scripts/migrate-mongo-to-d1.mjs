#!/usr/bin/env node
// scripts/migrate-mongo-to-d1.mjs
// Extracts collections from MongoDB Atlas and executes import into Cloudflare D1.

import { MongoClient } from 'mongodb';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const mongoUri =
  process.env.MONGODB_URI ||
  process.argv[2] ||
  null;

if (!mongoUri) {
  console.error('Error: MONGODB_URI environment variable or command-line argument is required.');
  console.error('Usage: MONGODB_URI="mongodb+srv://..." npm run migrate:mongo-to-d1');
  console.error('   or: node scripts/migrate-mongo-to-d1.mjs "mongodb+srv://..."');
  process.exit(1);
}

const isLocal = process.argv.includes('--local');
const d1DbName = 'skipass-earlybird-checker-d1';

function escapeSqlString(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return isNaN(val) ? 'NULL' : String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  return `'${str.replace(/'/g, "''")}'`;
}

function formatDate(val) {
  if (!val) return 'datetime(\'now\')';
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
  return `'${String(val)}'`;
}

async function main() {
  console.log('Connecting to MongoDB Atlas...');
  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 20000 });

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas successfully!');

    // Resolve target database (SkipassEarlybirdCheckerDB or default from URI)
    let db = client.db();
    if (!db.databaseName || db.databaseName === 'test') {
      db = client.db('SkipassEarlybirdCheckerDB');
    }
    console.log(`Using database: "${db.databaseName}"`);

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);
    console.log('Collections present in database:', collectionNames);

    // 1. Resolve configurations collection
    const configCollName =
      collectionNames.find((n) => n === 'checker_configuration' || n === 'checker_configurations') ||
      'checker_configuration';

    // 2. Resolve history collection
    const historyCollName =
      collectionNames.find((n) => n === 'checker_content' || n === 'checker_history') ||
      'checker_content';

    console.log(`Reading configurations from "${configCollName}"...`);
    const configs = await db.collection(configCollName).find({}).sort({ id: 1 }).toArray();
    console.log(`Found ${configs.length} configurations in MongoDB.`);

    console.log(`Reading history from "${historyCollName}"...`);
    const history = await db.collection(historyCollName).find({}).sort({ id: 1 }).toArray();
    console.log(`Found ${history.length} check history entries in MongoDB.`);

    const sqlStatements = [];
    sqlStatements.push('-- Cloudflare D1 automated migration import dump');
    sqlStatements.push('PRAGMA foreign_keys = OFF;');

    // Build configuration inserts
    if (configs.length > 0) {
      sqlStatements.push('\n-- Migrated configurations');
      for (const c of configs) {
        const id = c.id !== undefined ? Number(c.id) : 'NULL';
        const isActive = c.is_active ? 1 : 0;
        const targetDate = escapeSqlString(c.target_date || c.targetDate || '');
        const targetLabel = escapeSqlString(c.target_label || c.targetLabel || '');
        const isMailAlert = c.is_mail_alert ? 1 : 0;
        const mailAddress = escapeSqlString(c.mail_alert_address || '');
        const mailContact = escapeSqlString(c.mail_alert_contact || '');
        const createdAt = formatDate(c.created_at);
        const updatedAt = formatDate(c.updated_at || c.created_at);

        sqlStatements.push(
          `INSERT OR REPLACE INTO checker_configurations (id, is_active, target_date, target_label, is_mail_alert, mail_alert_address, mail_alert_contact, created_at, updated_at) VALUES (${id}, ${isActive}, ${targetDate}, ${targetLabel}, ${isMailAlert}, ${mailAddress}, ${mailContact}, ${createdAt}, ${updatedAt});`
        );
      }
    }

    // Build history inserts
    if (history.length > 0) {
      sqlStatements.push('\n-- Migrated check history');
      for (const h of history) {
        const id = h.id !== undefined ? Number(h.id) : 'NULL';
        const createdAt = formatDate(h.created_at);
        const httpCode = escapeSqlString(h.http_code !== undefined ? String(h.http_code) : '200');
        const fullUrl = escapeSqlString(h.full_url || '');
        const targetDate = escapeSqlString(h.target_date || '');
        const targetLabel = escapeSqlString(h.target_label || '');
        const price = h.price != null && !isNaN(Number(h.price)) ? Number(h.price) : 'NULL';
        const rawResponse = h.response_text || h.content || '';
        // Cap response text to 50k chars
        const truncated =
          rawResponse.length > 50000
            ? rawResponse.slice(0, 50000) + '\n\n<!-- [Truncated for D1 storage] -->'
            : rawResponse;
        const responseText = escapeSqlString(truncated);

        sqlStatements.push(
          `INSERT OR REPLACE INTO checker_history (id, created_at, http_code, full_url, target_date, target_label, price, response_text) VALUES (${id}, ${createdAt}, ${httpCode}, ${fullUrl}, ${targetDate}, ${targetLabel}, ${price}, ${responseText});`
        );
      }
    }

    const dumpDir = path.resolve(process.cwd(), 'migrations');
    if (!fs.existsSync(dumpDir)) fs.mkdirSync(dumpDir, { recursive: true });

    // Split into smaller SQL files if needed (D1 execute performs best with files <= 1-2 MB)
    const sqlFilePath = path.join(dumpDir, 'mongo_import_dump.sql');
    fs.writeFileSync(sqlFilePath, sqlStatements.join('\n'), 'utf8');
    console.log(`Generated SQL import file: ${sqlFilePath} (${(fs.statSync(sqlFilePath).size / 1024).toFixed(1)} KB)`);

    console.log(`Executing SQL import on ${isLocal ? 'local' : 'remote'} Cloudflare D1 database "${d1DbName}"...`);
    const targetFlag = isLocal ? '--local' : '--remote';
    const cmd = `npx wrangler d1 execute ${d1DbName} ${targetFlag} --file=${sqlFilePath} --yes`;
    console.log(`Running: ${cmd}`);
    execSync(cmd, { stdio: 'inherit' });

    console.log('\n--- Migration Audit Verification ---');
    execSync(`npx wrangler d1 execute ${d1DbName} ${targetFlag} --command="SELECT COUNT(*) AS total_configurations FROM checker_configurations;" --yes`, {
      stdio: 'inherit',
    });
    execSync(`npx wrangler d1 execute ${d1DbName} ${targetFlag} --command="SELECT COUNT(*) AS total_history FROM checker_history;" --yes`, {
      stdio: 'inherit',
    });

    console.log('\nMigration completed successfully! All data has been transferred into Cloudflare D1.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
