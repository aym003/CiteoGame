const fs   = require('fs');
const path = require('path');

const COLORS     = ['jaune', 'vert', 'noir'];
const ITEM_SCALE = 0.75;
const imgDir     = path.join(__dirname, '../img');

function readViewBox(filepath) {
    const src = fs.readFileSync(filepath, 'utf8');
    const m = src.match(/viewBox\s*=\s*["'][^"']*?\s+([0-9.]+)\s+([0-9.]+)["']/i);
    if (m) return { w: parseFloat(m[1]), h: parseFloat(m[2]) };
    const mw = src.match(/\bwidth\s*=\s*["']?([0-9.]+)/i);
    const mh = src.match(/\bheight\s*=\s*["']?([0-9.]+)/i);
    if (mw && mh) return { w: parseFloat(mw[1]), h: parseFloat(mh[1]) };
    return { w: 64, h: 64 };
}

const manifest = {};

for (const color of COLORS) {
    const colorDir = path.join(imgDir, color);
    const binDir   = path.join(colorDir, 'bin');

    const bins = fs.existsSync(binDir)
        ? fs.readdirSync(binDir).filter(f => f.toLowerCase().endsWith('.svg')).sort()
        : [];

    const items = fs.existsSync(colorDir)
        ? fs.readdirSync(colorDir)
            .filter(f => f.toLowerCase().endsWith('.svg'))
            .sort()
            .map(f => {
                const { w, h } = readViewBox(path.join(colorDir, f));
                return { file: f, w: Math.round(w * ITEM_SCALE), h: Math.round(h * ITEM_SCALE) };
            })
        : [];

    manifest[color] = { bins, items };
}

// Write as a JS file (loaded via <script> tag — no XHR needed, works with file://)
const js = `window.BIN_MANIFEST = ${JSON.stringify(manifest, null, 2)};\n`;
fs.writeFileSync(path.join(imgDir, 'bins.js'), js);

console.log('bins.js updated:');
for (const [color, { bins, items }] of Object.entries(manifest)) {
    console.log(`  ${color}: ${bins.length} bin skin(s), ${items.length} item(s) [${items.map(i => i.file).join(', ')}]`);
}
