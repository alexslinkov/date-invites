const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

loadEnv();
const port = Number(process.env.PORT || 3000);
const root = __dirname;
const dataPath = path.join(root, 'data.json');
const adminPassword = process.env.ADMIN_PASSWORD || 'change-me';
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const item = line.match(/^\s*([A-Z_]+)=(.*)$/);
    if (item && !process.env[item[1]]) process.env[item[1]] = item[2].trim();
  }
}
function localData() { return fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath, 'utf8')) : { invites: [] }; }
function writeLocal(data) { fs.writeFileSync(dataPath, JSON.stringify(data, null, 2)); }
function usingSupabase() { return Boolean(supabaseUrl && supabaseKey); }
async function database(route, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/invites${route}`, { ...options, headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, ...options.headers } });
  if (!response.ok) throw new Error('Не удалось сохранить данные в базе');
  return response.status === 204 ? null : response.json();
}
async function allInvites() { return usingSupabase() ? database('?select=*&order=created_at.desc') : localData().invites; }
async function getInvite(code) {
  if (usingSupabase()) { const rows = await database(`?code=eq.${encodeURIComponent(code)}&select=*`); return rows[0]; }
  return localData().invites.find(item => item.code === code);
}
async function createInvite(invite) {
  if (usingSupabase()) return (await database('', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(invite) }))[0];
  const data = localData(); data.invites.unshift(invite); writeLocal(data); return invite;
}
async function updateInvite(code, changes) {
  if (usingSupabase()) return database(`?code=eq.${encodeURIComponent(code)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) });
  const data = localData(); const invite = data.invites.find(item => item.code === code); Object.assign(invite, changes); writeLocal(data);
}
async function deleteInvite(code) {
  if (usingSupabase()) return database(`?code=eq.${encodeURIComponent(code)}`, { method: 'DELETE' });
  const data = localData(); data.invites = data.invites.filter(item => item.code !== code); writeLocal(data);
}
function send(res, status, body, type = 'application/json') { res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store' }); res.end(type === 'application/json' ? JSON.stringify(body) : body); }
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', part => { raw += part; if (raw.length > 100000) reject(new Error('Слишком большой запрос')); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Некорректные данные')); } });
  });
}
function authorized(req) { return req.headers['x-admin-password'] === adminPassword && (!req.headers['x-admin-username'] || req.headers['x-admin-username'] === adminUsername); }
function clean(value, max = 120) { return String(value || '').trim().slice(0, max); }
function slug() { return crypto.randomBytes(5).toString('hex'); }
function publicUrl(req, code) { return `${(process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `http://${req.headers.host}`).replace(/\/$/, '')}/i/${code}`; }
async function telegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN; const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: message }) });
  return response.ok;
}
function staticFile(res, file, type) { send(res, 200, fs.readFileSync(path.join(root, file), 'utf8'), type); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === 'GET' && url.pathname === '/') return staticFile(res, 'public/index.html', 'text/html');
    if (req.method === 'GET' && url.pathname === '/admin') return staticFile(res, 'public/admin.html', 'text/html');
    if (req.method === 'GET' && url.pathname.startsWith('/i/')) return staticFile(res, 'public/invite.html', 'text/html');
    if (req.method === 'GET' && url.pathname === '/app.js') return staticFile(res, 'public/app.js', 'text/javascript');
    if (req.method === 'GET' && url.pathname === '/styles.css') return staticFile(res, 'public/styles.css', 'text/css');
    if (req.method === 'GET' && url.pathname.startsWith('/api/invites/')) {
      const invite = await getInvite(url.pathname.split('/').pop());
      if (!invite) return send(res, 404, { error: 'Приглашение не найдено' });
      return send(res, 200, { recipient: invite.recipient, question: invite.question, options: invite.options, status: invite.status });
    }
    if (req.method === 'POST' && url.pathname.startsWith('/api/invites/') && url.pathname.endsWith('/response')) {
      const code = url.pathname.split('/')[3]; const body = await parseBody(req); const invite = await getInvite(code);
      if (!invite) return send(res, 404, { error: 'Приглашение не найдено' });
      const answer = clean(body.answer, 10);
      if (!['yes', 'no'].includes(answer)) return send(res, 400, { error: 'Выберите ответ' });
      const response = { answer, date: clean(body.date, 20), time: clean(body.time, 20), idea: clean(body.idea), at: new Date().toISOString() };
      await updateInvite(code, { status: answer === 'yes' ? 'accepted' : 'declined', response });
      const text = answer === 'yes' ? `❤️ ${invite.recipient} сказала «да»!\n${response.date || 'Дата не выбрана'}, ${response.time || 'время не выбрано'}\nИдея: ${response.idea || 'не выбрана'}` : `Ответ на приглашение для ${invite.recipient}: «нет»`;
      telegram(text).catch(() => {});
      return send(res, 200, { ok: true });
    }
    if (req.method === 'GET' && url.pathname === '/api/admin/invites') {
      if (!authorized(req)) return send(res, 401, { error: 'Неверный пароль' });
      return send(res, 200, await allInvites());
    }
    if (req.method === 'POST' && url.pathname === '/api/admin/invites') {
      if (!authorized(req)) return send(res, 401, { error: 'Неверный пароль' });
      const body = await parseBody(req); const recipient = clean(body.recipient);
      if (!recipient) return send(res, 400, { error: 'Укажите имя' });
      const options = Array.isArray(body.options) ? body.options.map(item => ({ title: clean(item.title), emoji: clean(item.emoji, 8) })).filter(item => item.title) : [clean(body.idea1) || 'Уютный кофе', clean(body.idea2) || 'Прогулка', clean(body.idea3) || 'Ужин'];
      const invite = { code: slug(), recipient, question: clean(body.question) || 'Пойдёшь со мной на свидание?', options, status: 'sent', created_at: new Date().toISOString() };
      const saved = await createInvite(invite);
      return send(res, 201, { invite: saved, url: publicUrl(req, saved.code) });
    }
    if (url.pathname.startsWith('/api/admin/invites/') && req.method === 'DELETE') {
      if (!authorized(req)) return send(res, 401, { error: 'Неверный пароль' });
      await deleteInvite(url.pathname.split('/').pop()); return send(res, 200, { ok: true });
    }
    if (url.pathname.startsWith('/api/admin/invites/') && req.method === 'PATCH') {
      if (!authorized(req)) return send(res, 401, { error: 'Неверный пароль' });
      const body = await parseBody(req); const options = Array.isArray(body.options) ? body.options.map(item => ({ title: clean(item.title), emoji: clean(item.emoji, 8) })).filter(item => item.title) : undefined;
      await updateInvite(url.pathname.split('/').pop(), { recipient: clean(body.recipient), question: clean(body.question), ...(options ? { options } : {}) });
      return send(res, 200, { ok: true });
    }
    return send(res, 404, { error: 'Страница не найдена' });
  } catch (error) { console.error(error); return send(res, 400, { error: error.message || 'Ошибка сервера' }); }
});
server.listen(port, '0.0.0.0', () => console.log(`Date Invites: http://localhost:${port}`));
