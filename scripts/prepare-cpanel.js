const fs = require('fs');
const path = require('path');

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('📦 Preparing cPanel standalone bundle...');

// 1. Copy public to .next/standalone/public
const publicSrc = path.join(__dirname, '..', 'public');
const publicDest = path.join(__dirname, '..', '.next', 'standalone', 'public');
if (fs.existsSync(publicSrc)) {
  copyDirSync(publicSrc, publicDest);
  console.log('✓ Copied public/ -> .next/standalone/public/');
}

// 2. Copy .next/static to .next/standalone/.next/static
const staticSrc = path.join(__dirname, '..', '.next', 'static');
const staticDest = path.join(__dirname, '..', '.next', 'standalone', '.next', 'static');
if (fs.existsSync(staticSrc)) {
  copyDirSync(staticSrc, staticDest);
  console.log('✓ Copied .next/static/ -> .next/standalone/.next/static/');
}

// 3. Copy .env.production to .next/standalone/.env
const envSrc = path.join(__dirname, '..', '.env.production');
const envDest = path.join(__dirname, '..', '.next', 'standalone', '.env');
if (fs.existsSync(envSrc)) {
  fs.copyFileSync(envSrc, envDest);
  console.log('✓ Copied .env.production -> .next/standalone/.env');
}

// 4. Copy .htaccess to .next/standalone/.htaccess
const htaccessSrc = path.join(__dirname, '..', '.htaccess');
const htaccessDest = path.join(__dirname, '..', '.next', 'standalone', '.htaccess');
if (fs.existsSync(htaccessSrc)) {
  fs.copyFileSync(htaccessSrc, htaccessDest);
  console.log('✓ Copied .htaccess -> .next/standalone/.htaccess');
}

// 5. Copy server.js to .next/standalone/server.js if not present
const serverDest = path.join(__dirname, '..', '.next', 'standalone', 'server.js');
if (fs.existsSync(serverDest)) {
  console.log('✓ .next/standalone/server.js is ready');
}

console.log('\n🎉 cPanel production bundle is ready in: .next/standalone/');
