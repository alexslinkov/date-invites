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
  let invite; let selectedIdea = ''; const icons = ['🍕', '🍣', '🍔', '🎬', '🌃', '🎳'];
  const show = id => document.querySelectorAll('.step').forEach(step => step.classList.toggle('active', step.id === id));
  request(`/api/invites/${inviteCode}`).then(data => {
    invite = data; $('#for').textContent = `${data.recipient}, привет 👋`; $('#question').textContent = data.question;
    $('#ideas').innerHTML = data.options.map((option, index) => `<button type="button" data-idea="${escapeHtml(option)}"><span>${icons[index]}</span>${escapeHtml(option)}</button>`).join('');
    document.querySelectorAll('[data-idea]').forEach(button => button.onclick = () => { document.querySelectorAll('[data-idea]').forEach(x => x.classList.remove('selected')); button.classList.add('selected'); selectedIdea = button.dataset.idea; $('#to-date').disabled = false; });
  }).catch(error => { $('#question').textContent = error.message; });
  const noButton = $('[data-answer="no"]'); const phone = $('.date-phone');
  const escapeNo = () => { const box = phone.getBoundingClientRect(); noButton.classList.add('escaping'); noButton.style.left = `${box.left + 24 + Math.random() * (box.width - noButton.offsetWidth - 48)}px`; noButton.style.top = `${box.top + 24 + Math.random() * (box.height - noButton.offsetHeight - 48)}px`; };
  noButton.onpointerenter = escapeNo; noButton.onclick = event => { event.preventDefault(); escapeNo(); };
  $('[data-answer="yes"]').onclick = () => { noButton.classList.remove('escaping'); show('step-yes'); };
  $('#to-ideas').onclick = () => show('step-date');
  $('#details').onsubmit = event => { event.preventDefault(); show('step-ideas'); };
  $('#to-date').onclick = () => { if (selectedIdea) finish({ answer: 'yes', date: $('#date').value, time: $('#time').value, idea: selectedIdea }); };
  async function finish(body) { try { await request(`/api/invites/${inviteCode}/response`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); $('#ticket-lead').textContent = `${invite.recipient}, ты сказала «Да» 💘`; $('#ticket-text').textContent = `Встречаемся ${body.date} в ${body.time}. В планах: ${body.idea}.`; $('#ticket-date').textContent = body.date; $('#ticket-time').textContent = body.time; $('#ticket-idea').textContent = body.idea; show('step-ticket'); } catch (error) { alert(error.message); } }
}
