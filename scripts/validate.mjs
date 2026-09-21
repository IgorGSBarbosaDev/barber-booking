import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requiredFiles = [
  'docs/PRD.md', 'docs/DATA_MODEL.md', 'AGENTS.md', 'README.md',
  'apps/public/appsscript.json', 'apps/public/src/Code.gs', 'apps/public/src/views/PublicApp.html',
  'apps/admin/appsscript.json', 'apps/admin/src/Code.gs', 'apps/admin/src/views/AdminApp.html'
];
const requiredSheets = ['CLIENTS', 'SERVICES', 'APPOINTMENTS', 'WORK_SCHEDULE', 'SCHEDULE_OVERRIDES', 'BLOCKS', 'SETTINGS', 'AUDIT_LOG', 'OTP_CODES'];
const errors = [];

for (const relative of requiredFiles) {
  if (!fs.existsSync(path.join(projectRoot, relative))) errors.push('arquivo ausente: ' + relative);
}

for (const app of ['public', 'admin']) {
  const manifestPath = path.join(projectRoot, 'apps', app, 'appsscript.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.timeZone !== 'America/Sao_Paulo') errors.push(app + ': timezone inválido');
  if (manifest.runtimeVersion !== 'V8') errors.push(app + ': runtime inválido');
  for (const scope of ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/script.send_mail']) {
    if (!manifest.oauthScopes.includes(scope)) errors.push(app + ': scope ausente ' + scope);
  }
  const source = fs.readFileSync(path.join(projectRoot, 'apps', app, 'src', 'Code.gs'), 'utf8');
  if (!/function\s+doGet\s*\(/.test(source)) errors.push(app + ': doGet ausente');
}

const config = fs.readFileSync(path.join(projectRoot, 'apps', 'public', 'src', 'utils', 'Config.gs'), 'utf8');
for (const sheet of requiredSheets) {
  if (!config.includes(sheet + ':')) errors.push('schema ausente: ' + sheet);
}

const sources = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (entry.name.endsWith('.gs')) sources.push(fs.readFileSync(absolute, 'utf8'));
  }
}
walk(path.join(projectRoot, 'apps'));
const joined = sources.join('\n');
for (const marker of ['LockService.getScriptLock', 'CalendarApp', 'MailApp', 'PropertiesService', 'BOOKING_CREATED', 'OTP_CODES']) {
  if (!joined.includes(marker)) errors.push('implementação ausente: ' + marker);
}

if (errors.length) {
  console.error(errors.map(error => '- ' + error).join('\n'));
  process.exit(1);
}

console.log('Barber Booking validation: OK');
