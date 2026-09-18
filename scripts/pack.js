const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'release', 'FGUIAssistant');

fs.rmSync(path.join(root, 'release'), { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

function copyDir(src, dst) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dst, entry.name);
        if (entry.isDirectory()) copyDir(s, d);
        else fs.copyFileSync(s, d);
    }
}

copyDir(path.join(root, 'dist'), path.join(out, 'dist'));

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
delete pkg.scripts;
delete pkg.devDependencies;
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');

for (const f of ['icon.png', 'README.md', 'CHANGELOG.md']) {
    const p = path.join(root, f);
    if (fs.existsSync(p)) fs.copyFileSync(p, path.join(out, f));
}

console.log('已输出到: ' + out);
