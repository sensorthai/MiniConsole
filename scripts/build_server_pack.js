const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const packName = 'MiniConsole-Server-Pack';
const packDir = path.join(distDir, packName);

const itemsToCopy = [
  'app',
  'public',
  'games',
  'js',
  'server.js',
  'ws_game_server.js',
  'next.config.js',
  'tsconfig.json',
  'next-env.d.ts',
  'package.json',
  'package-lock.json',
  'index.html',
  'install.sh',
  'install.ps1',
  'install.bat',
  'start.sh',
  'start.bat',
  'README_SERVER.md'
];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      if (entry === '.DS_Store') continue;
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    fs.chmodSync(dest, stat.mode);
  }
}

console.log('[PACK] Cleaning previous dist/MiniConsole-Server-Pack...');
fs.rmSync(packDir, { recursive: true, force: true });
fs.mkdirSync(packDir, { recursive: true });

for (const item of itemsToCopy) {
  const src = path.join(rootDir, item);
  if (!fs.existsSync(src)) {
    console.warn(`[WARN] Skipping missing item: ${item}`);
    continue;
  }
  copyRecursive(src, path.join(packDir, item));
}

// Ensure Unix shell scripts have executable bit
for (const sh of ['install.sh', 'start.sh']) {
  const p = path.join(packDir, sh);
  if (fs.existsSync(p)) fs.chmodSync(p, 0o755);
}

console.log(`[PACK] Folder ready: ${packDir}`);

try {
  execSync(`tar -czf "${packName}.tar.gz" "${packName}"`, { cwd: distDir, stdio: 'inherit' });
  console.log(`[PACK] Created archive: ${path.join(distDir, packName + '.tar.gz')}`);
} catch (err) {
  console.warn('[WARN] Could not create .tar.gz:', err.message);
}

try {
  execSync(`zip -rq "${packName}.zip" "${packName}"`, { cwd: distDir, stdio: 'inherit' });
  console.log(`[PACK] Created archive: ${path.join(distDir, packName + '.zip')}`);
} catch (err) {
  console.warn('[WARN] Could not create .zip:', err.message);
}
