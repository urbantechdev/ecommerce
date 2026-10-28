import fs from 'fs';
import path from 'path';

const routes = [
  'school-uniforms',
  'kmtc-uniforms',
  'customized-uniforms',
  'about',
  'policy',
  'contact',
  'portal',
  'erp',
  'login',
  'admin'
];

const distIndex = path.resolve('dist/index.html');
if (fs.existsSync(distIndex)) {
  const content = fs.readFileSync(distIndex);
  for (const route of routes) {
    const dir = path.resolve('dist', route);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), content);
  }
  console.log('[Postbuild] Generated static SPA fallback index.html for all routes.');
}
