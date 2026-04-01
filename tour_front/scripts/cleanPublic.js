// Clean heavy legacy assets from public folder
// Usage: node scripts/cleanPublic.js

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');

const targets = [
  'vendors',
  'build',
  'assets',
  'css',
  'js',
  'docs',
  'src',
  'fonts',
  'images',
];

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  const stat = fs.lstatSync(p);
  if (stat.isDirectory()) {
    // Recursively delete directory contents first
    for (const entry of fs.readdirSync(p)) {
      rmrf(path.join(p, entry));
    }
    fs.rmdirSync(p);
    console.log('Removed dir:', p);
  } else {
    fs.unlinkSync(p);
    console.log('Removed file:', p);
  }
}

function main() {
  for (const t of targets) {
    const full = path.join(publicDir, t);
    try {
      rmrf(full);
    } catch (e) {
      console.warn('Failed to remove', full, e.message);
    }
  }
  console.log('Cleanup completed. Kept index.html, manifest.json, robots.txt, logo192.png, logo512.png');
}

main();

