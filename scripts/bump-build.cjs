const fs = require('fs');
const path = require('path');

const appJsonPath = path.resolve(__dirname, '..', 'app.json');
const raw = fs.readFileSync(appJsonPath, 'utf8');
const config = JSON.parse(raw);

if (!config.expo) {
  throw new Error('app.json mist expo configuratie.');
}

const currentIos = Number(config.expo?.ios?.buildNumber ?? 0);
const currentAndroid = Number(config.expo?.android?.versionCode ?? 0);

const nextIos = String((Number.isFinite(currentIos) ? currentIos : 0) + 1);
const nextAndroid = (Number.isFinite(currentAndroid) ? currentAndroid : 0) + 1;

config.expo.ios = {
  ...(config.expo.ios || {}),
  buildNumber: nextIos,
};

config.expo.android = {
  ...(config.expo.android || {}),
  versionCode: nextAndroid,
};

fs.writeFileSync(appJsonPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log(`Build bumped -> ios.buildNumber=${nextIos}, android.versionCode=${nextAndroid}`);
