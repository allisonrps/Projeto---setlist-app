const fs = require('fs');
const path = require('path');
const { generateImageAsync } = require('@expo/image-utils');

const projectRoot = path.resolve(__dirname, '..');
const iconSrc = path.join(projectRoot, 'assets/icon.png');
const foregroundSrc = path.join(projectRoot, 'assets/android-icon-foreground.png');

const configs = [
  { folder: 'mipmap-mdpi', iconSize: 48, foregroundSize: 108 },
  { folder: 'mipmap-hdpi', iconSize: 72, foregroundSize: 162 },
  { folder: 'mipmap-xhdpi', iconSize: 96, foregroundSize: 216 },
  { folder: 'mipmap-xxhdpi', iconSize: 144, foregroundSize: 324 },
  { folder: 'mipmap-xxxhdpi', iconSize: 192, foregroundSize: 432 },
];

async function run() {
  console.log('Generating Android res mipmap icons...');

  for (const cfg of configs) {
    const dir = path.join(projectRoot, 'android/app/src/main/res', cfg.folder);
    if (!fs.existsSync(dir)) {
      console.log('Skipping missing dir:', dir);
      continue;
    }

    console.log(`Processing ${cfg.folder}: icon=${cfg.iconSize}px, foreground=${cfg.foregroundSize}px`);

    // 1. Generate ic_launcher.png and ic_launcher.webp
    const iconPng = await generateImageAsync({ projectRoot }, { src: iconSrc, mime: 'image/png', width: cfg.iconSize, height: cfg.iconSize });
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), iconPng.source);
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), iconPng.source);

    const iconWebp = await generateImageAsync({ projectRoot }, { src: iconSrc, mime: 'image/webp', width: cfg.iconSize, height: cfg.iconSize });
    fs.writeFileSync(path.join(dir, 'ic_launcher.webp'), iconWebp.source);
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.webp'), iconWebp.source);

    // 2. Generate ic_launcher_foreground.png and ic_launcher_foreground.webp
    const fgPng = await generateImageAsync({ projectRoot }, { src: foregroundSrc, mime: 'image/png', width: cfg.foregroundSize, height: cfg.foregroundSize });
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), fgPng.source);

    const fgWebp = await generateImageAsync({ projectRoot }, { src: foregroundSrc, mime: 'image/webp', width: cfg.foregroundSize, height: cfg.foregroundSize });
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.webp'), fgWebp.source);
  }

  // Also ensure play-store-icon.png (512x512) is updated
  const playStoreIcon = await generateImageAsync({ projectRoot }, { src: iconSrc, mime: 'image/png', width: 512, height: 512 });
  fs.writeFileSync(path.join(projectRoot, 'assets/play-store-icon.png'), playStoreIcon.source);

  console.log('All Android icons generated successfully without text!');
}

run().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
