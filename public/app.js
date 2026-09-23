const $ = selector => document.querySelector(selector);
const inviteCode = location.pathname.split('/')[2];

async function request(url, options = {}) { const response = await fetch(url, options); const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; }
function escapeHtml(value) { const box = document.createElement('div'); box.textContent = value; return box.innerHTML; }

if ($('#invite-form')) {
  const form = $('#invite-form'); const password = $('#password'); const username = $('#username'); let editingCode = '';
  const auth = () => ({ 'X-Admin-Password': password.value, 'X-Admin-Username': username.value });
  username.value = localStorage.dateInvitesUser || 'admin'; password.value = localStorage.dateInvitesPassword || '';
  if (password.value) { $('#logout').hidden = false; setTimeout(loadInvites, 0); }
  $('#logout').onclick = () => { localStorage.removeItem('dateInvitesUser'); localStorage.removeItem('dateInvitesPassword'); password.value = ''; $('#logout').hidden = true; };
  $('#toggle-password').onclick = () => {
    const visible = password.type === 'text'; password.type = visible ? 'password' : 'text';
    $('#toggle-password').textContent = visible ? '◉' : '◉̸';
  };
  $('#add-event').onclick = () => { $('#events').insertAdjacentHTML('beforeend', '<div class="event-row"><input class="event-emoji" value="✨" aria-label="Эмодзи"><input class="event-title" placeholder="Например, боулинг" aria-label="Мероприятие"></div>'); };
  let activeEmoji = document.querySelector('.event-emoji'); document.addEventListener('focusin', event => { if (event.target.classList.contains('event-emoji')) activeEmoji = event.target; });
  const popularEmojis = ['☕', '🍵', '🥐', '🍕', '🍣', '🍔', '🍝', '🍰', '🍷', '🥂', '🍽️', '🌃', '🌇', '🌅', '🌳', '🏙️', '🎬', '🎭', '🎤', '🎨', '🎳', '🎡', '🎯', '🎮', '🚶', '🚗', '🛶', '✈️', '🌹', '💐', '🧸', '🎁', '❤️', '💕', '💘', '✨', '🕯️', '🧁', '📸', '🎉'];
  $('#emoji-bank').innerHTML = popularEmojis.map(emoji => `<button type="button" title="Поставить ${emoji}">${emoji}</button>`).join('');
  document.querySelectorAll('#emoji-bank button').forEach(button => button.onclick = () => { if (activeEmoji) { activeEmoji.value = button.textContent; activeEmoji.focus(); } });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const body = Object.fromEntries(new FormData(form)); body.options = [...document.querySelectorAll('.event-row')].map(row => ({ emoji: row.querySelector('.event-emoji').value, title: row.querySelector('.event-title').value }));
      localStorage.dateInvitesUser = username.value; localStorage.dateInvitesPassword = password.value; $('#logout').hidden = false; const url = editingCode ? `/api/admin/invites/${editingCode}` : '/api/admin/invites'; const data = await request(url, { method: editingCode ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', ...auth() }, body: JSON.stringify(body) });
      $('#result').hidden = false; $('#result').innerHTML = editingCode ? '<b>Приглашение сохранено.</b>' : `<b>Готово!</b><p>Скопируй и отправь эту ссылку:</p><div class="url">${escapeHtml(data.url)}</div><button class="copy" type="button">Скопировать</button>`;
      if ($('.copy')) $('.copy').onclick = () => navigator.clipboard.writeText(data.url).then(() => $('.copy').textContent = 'Скопировано ✓');
      editingCode = ''; form.querySelector('.button').innerHTML = 'Сохранить приглашение <span>→</span>'; loadInvites();
    } catch (error) { alert(error.message); }
  });
  async function loadInvites() {
    if (!password.value) return;
    try { const list = await request('/api/admin/invites', { headers: { 'X-Admin-Password': password.value } }); $('#invites').innerHTML = list.length ? list.map(item => `<article><b>${escapeHtml(item.recipient)}</b><a href="/i/${item.code}" target="_blank">Открыть</a><button class="edit-invite" data-code="${item.code}">Править</button><button class="delete-invite" data-code="${item.code}">Удалить</button></article>`).join('') : 'Пока нет приглашений.'; document.querySelectorAll('.edit-invite').forEach(button => button.onclick = () => { const item = list.find(x => x.code === button.dataset.code); editingCode = item.code; $('#recipient').value = item.recipient; $('#question').value = item.question; $('#events').innerHTML = item.options.map(x => typeof x === 'string' ? `<div class="event-row"><input class="event-emoji" value="✨"><input class="event-title" value="${escapeHtml(x)}"></div>` : `<div class="event-row"><input class="event-emoji" value="${escapeHtml(x.emoji)}"><input class="event-title" value="${escapeHtml(x.title)}"></div>`).join(''); form.querySelector('.button').innerHTML = 'Сохранить изменения <span>→</span>'; window.scrollTo({ top: 0, behavior: 'smooth' }); }); document.querySelectorAll('.delete-invite').forEach(button => button.onclick = async () => { if (!confirm('Удалить приглашение?')) return; await request(`/api/admin/invites/${button.dataset.code}`, { method: 'DELETE', headers: { 'X-Admin-Password': password.value } }); loadInvites(); }); } catch {} 
  }
  password.addEventListener('change', loadInvites);
}

if ($('#invite')) {
  let invite; let selectedIdea = ''; const icons = ['🍕', '🍣', '🍔', '🎬', '🌃', '🎳'];
  const show = id => document.querySelectorAll('.step').forEach(step => step.classList.toggle('active', step.id === id));
  request(`/api/invites/${inviteCode}`).then(data => {
    invite = data; $('#for').textContent = `${data.recipient}, привет 👋`; $('#question').textContent = data.question;
    $('#ideas').innerHTML = data.options.map((option, index) => { const title = typeof option === 'string' ? option : option.title; const emoji = typeof option === 'string' ? icons[index] : option.emoji || icons[index]; return `<button type="button" data-idea="${escapeHtml(title)}"><span>${escapeHtml(emoji)}</span>${escapeHtml(title)}</button>`; }).join('');
    document.querySelectorAll('[data-idea]').forEach(button => button.onclick = () => { document.querySelectorAll('[data-idea]').forEach(x => x.classList.remove('selected')); button.classList.add('selected'); selectedIdea = button.dataset.idea; $('#to-date').disabled = false; });
  }).catch(error => { $('#question').textContent = error.message; });
  const noButton = $('[data-answer="no"]'); const phone = $('.date-phone');
  const escapeNo = () => { const box = phone.getBoundingClientRect(); noButton.classList.add('escaping'); noButton.style.left = `${box.left + 24 + Math.random() * (box.width - noButton.offsetWidth - 48)}px`; noButton.style.top = `${box.top + 24 + Math.random() * (box.height - noButton.offsetHeight - 48)}px`; };
  noButton.onpointerenter = escapeNo; noButton.onclick = event => { event.preventDefault(); escapeNo(); };
  $('[data-answer="yes"]').onclick = () => { noButton.classList.remove('escaping'); show('step-yes'); };
  $('#to-ideas').onclick = () => show('step-date');
  $('#details').onsubmit = event => { event.preventDefault(); show('step-ideas'); };
  $('#to-date').onclick = () => { if (selectedIdea) finish({ answer: 'yes', date: $('#date').value, time: $('#time').value, idea: selectedIdea }); };
  async function finish(body) { try { await request(`/api/invites/${inviteCode}/response`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const prettyDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(`${body.date}T12:00:00`)); $('#ticket-lead').textContent = `${invite.recipient}, ты сказала «Да» 💘`; $('#ticket-text').textContent = `Встречаемся ${prettyDate} в ${body.time}. В планах: ${body.idea}.`; $('#ticket-date').textContent = prettyDate; $('#ticket-time').textContent = body.time; $('#ticket-idea').textContent = body.idea; show('step-ticket'); } catch (error) { alert(error.message); } }
}
