#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const root = process.cwd();

const fileExists = (p) => fs.existsSync(p);

const updateJson = async (file, updater) => {
  const full = path.join(root, file);
  const raw = await fsp.readFile(full, 'utf8');
  const json = JSON.parse(raw);
  const next = await updater(json);
  await fsp.writeFile(full, JSON.stringify(next, null, 2) + '\n');
  console.log(`Updated ${file}`);
};

const replaceInFile = async (file, replacers) => {
  const full = path.join(root, file);
  let text = await fsp.readFile(full, 'utf8');
  for (const [from, to] of replacers) {
    text = text.replace(from, to);
  }
  await fsp.writeFile(full, text);
  console.log(`Updated ${file}`);
};

(async () => {
  console.log('--- Prepare Fork: set IDs and update endpoints ---');

  // Support CLI flags as non-interactive fallback
  const argMap = new Map();
  for (let i = 2; i < process.argv.length; i++) {
    const m = /^--([^=]+)=(.*)$/.exec(process.argv[i]);
    if (m) argMap.set(m[1], m[2]);
  }

  const rl = createInterface({ input, output });
  const ask = async (q, def = '') => {
    const prompt = def ? `${q} (${def}): ` : `${q}: `;
    const ans = await rl.question(prompt);
    return (ans ?? '').trim() || def;
  };

  try {
    const ghOwner = argMap.get('owner') ?? await ask('Your GitHub owner (username or org)');
    const ghRepo = argMap.get('repo') ?? await ask('Your GitHub repository name');
    const appId = argMap.get('appId') ?? await ask('Android/Tauri identifier (reverse DNS)', 'com.example.aiaw');
    const productName = argMap.get('productName') ?? await ask('Desktop productName', 'AIaW Custom');
    const appName = argMap.get('appName') ?? await ask('Android appName (Capacitor)', 'AIaW');

    const endpoint = `https://github.com/${ghOwner}/${ghRepo}/releases/latest/download/latest.json`;

    // Update Tauri config
    const tauriConf = 'src-tauri/tauri.conf.json';
    if (fileExists(tauriConf)) {
      await updateJson(tauriConf, (json) => {
        json.productName = productName;
        json.identifier = appId;
        if (json.plugins?.updater?.endpoints) {
          json.plugins.updater.endpoints = [endpoint];
        }
        return json;
      });
    }

    // Update Capacitor config
    const capConf = 'capacitor.config.ts';
    if (fileExists(capConf)) {
      await replaceInFile(capConf, [
        [/appId:\s*'[^']*'/g, `appId: '${appId}'`],
        [/appName:\s*'[^']*'/g, `appName: '${appName}'`],
      ]);
    }

    // Update Android gradle (namespace & applicationId)
    const appGradle = 'android/app/build.gradle';
    if (fileExists(appGradle)) {
      await replaceInFile(appGradle, [
        [/namespace\s+"[^"]+"/g, `namespace "${appId}"`],
        [/applicationId\s+"[^"]+"/g, `applicationId "${appId}"`],
      ]);
    }

    console.log('\nDone. Next steps:');
    console.log('- Put your Tauri public key into src-tauri/tauri.conf.json -> plugins.updater.pubkey');
    console.log('- Generate keys in .secrets and push GitHub secrets using provided scripts');
    console.log('- Create a GitHub Release to trigger CI builds');
  } finally {
    rl.close();
  }
})();
