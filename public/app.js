const $ = selector => document.querySelector(selector);
const inviteCode = location.pathname.split('/')[2];

async function request(url, options = {}) { const response = await fetch(url, options); const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; }
function escapeHtml(value) { const box = document.createElement('div'); box.textContent = value; return box.innerHTML; }

if ($('#invite-form')) {
  const form = $('#invite-form'); const password = $('#password');
  $('#toggle-password').onclick = () => {
    const visible = password.type === 'text'; password.type = visible ? 'password' : 'text';
    $('#toggle-password').textContent = visible ? '◉' : '◉̸';
  };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const body = Object.fromEntries(new FormData(form));
      const data = await request('/api/admin/invites', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password.value }, body: JSON.stringify(body) });
      $('#result').hidden = false; $('#result').innerHTML = `<b>Готово!</b><p>Скопируй и отправь эту ссылку:</p><div class="url">${escapeHtml(data.url)}</div><button class="copy" type="button">Скопировать</button>`;
      $('.copy').onclick = () => navigator.clipboard.writeText(data.url).then(() => $('.copy').textContent = 'Скопировано ✓');
      const savedPassword = password.value; form.reset(); password.value = savedPassword; loadInvites();
    } catch (error) { alert(error.message); }
  });
  async function loadInvites() {
    if (!password.value) return;
    try { const list = await request('/api/admin/invites', { headers: { 'X-Admin-Password': password.value } }); $('#invites').innerHTML = list.length ? list.map(item => `<article><b>${escapeHtml(item.recipient)}</b><span>${item.status === 'accepted' ? '♥ Согласилась' : item.status === 'declined' ? 'Отказ' : 'Ожидает ответа'}</span></article>`).join('') : 'Пока нет приглашений.'; } catch {} 
  }
  password.addEventListener('change', loadInvites);
}

if ($('#invite')) {
  let invite; let selectedIdea = '';
  request(`/api/invites/${inviteCode}`).then(data => {
    invite = data; $('#for').textContent = `Для ${data.recipient}`; $('#question').textContent = data.question;
    $('#ideas').innerHTML = data.options.map(option => `<button type="button" data-idea="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join('');
    document.querySelectorAll('[data-idea]').forEach(button => button.onclick = () => { document.querySelectorAll('[data-idea]').forEach(x => x.classList.remove('selected')); button.classList.add('selected'); selectedIdea = button.dataset.idea; });
  }).catch(error => { $('#question').textContent = error.message; });
  const noButton = $('[data-answer="no"]'); const ask = $('#ask');
  const escapeNo = () => { const width = ask.clientWidth - noButton.offsetWidth; const height = ask.clientHeight - noButton.offsetHeight; noButton.classList.add('escaping'); noButton.style.left = `${Math.max(0, Math.random() * width)}px`; noButton.style.top = `${Math.max(54, Math.random() * height)}px`; };
  noButton.onpointerenter = escapeNo; noButton.onclick = event => { event.preventDefault(); escapeNo(); };
  document.querySelectorAll('[data-answer="yes"]').forEach(button => button.onclick = async () => {
    noButton.classList.remove('escaping');
    $('#ask').hidden = true; $('#details').hidden = false;
  });
  $('#details').onsubmit = event => { event.preventDefault(); if (!selectedIdea) return alert('Выбери вариант встречи'); finish({ answer: 'yes', date: $('#date').value, time: $('#time').value, idea: selectedIdea }); };
  async function finish(body) { try { await request(`/api/invites/${inviteCode}/response`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); $('#ask').hidden = true; $('#details').hidden = true; $('#done').hidden = false; $('#done').innerHTML = body.answer === 'yes' ? '<div class="big-heart">♥</div><h2>Это свидание!</h2><p>Твой ответ уже отправлен.</p>' : '<h2>Спасибо за честный ответ</h2><p>Он уже отправлен.</p>'; } catch (error) { alert(error.message); } }
}
