#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const envPath = path.join(root, '.env');
const appJsonPath = path.join(root, 'app.json');

const parseDotEnv = (text) => {
  const lines = text.split(/\r?\n/);
  const result = {};
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const equalIndex = line.indexOf('=');
    if (equalIndex === -1) continue;
    const key = line.slice(0, equalIndex).trim();
    let value = line.slice(equalIndex + 1).trim();

    // Remove optional surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }
  return result;
};

const main = async () => {
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found at', envPath);
    process.exit(1);
  }

  if (!fs.existsSync(appJsonPath)) {
    console.error('❌ app.json file not found at', appJsonPath);
    process.exit(1);
  }

  const envText = await fs.promises.readFile(envPath, 'utf8');
  const env = parseDotEnv(envText);

  const appJsonText = await fs.promises.readFile(appJsonPath, 'utf8');
  const appJson = JSON.parse(appJsonText);

  appJson.expo = appJson.expo || {};
  appJson.expo.extra = appJson.expo.extra || {};

  // Sync only ADMIN_* keys so we don't overwrite other extras.
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith('ADMIN_')) {
      appJson.expo.extra[key] = value;
    }
  }

  await fs.promises.writeFile(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
  console.log('✅ Synced ADMIN_* vars from .env into app.json -> expo.extra');
};

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
