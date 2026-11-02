// Hub (cloud): Jarvis, Home, TV, Music and Games on your phone, behind a passcode.
const $ = (s) => document.querySelector(s);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function api(path, body) {
  const r = await fetch(path, { method: body ? 'POST' : 'GET', headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) {
    login();
    throw new Error('Signed out');
  }
  if (!r.ok || j.error) throw new Error(j.error || `Error ${r.status}`);
  return j;
}
let toastTimer;
function toast(m) {
  const t = $('#toast');
  t.textContent = m;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2400);
}
function sheet(html, wire) {
  const s = $('#sheet');
  s.innerHTML = `<div class="sheet"><div class="grab"></div>${html}</div>`;
  s.hidden = false;
  s.onclick = (e) => e.target === s && (s.hidden = true);
  wire?.(s);
}

// ---------- login: set a passcode once (with the setup code), then sign in ----------
async function login() {
  $('#tabs').hidden = true;
  const st = await fetch('/api/state').then((r) => r.json()).catch(() => ({}));
  if (st.signedIn) return start();
  const v = $('#view');
  v.innerHTML = st.setUp
    ? `<form class="login" id="lf"><div class="art">✦</div><h1>Welcome back</h1><input id="pc" type="password" inputmode="text" autocomplete="current-password" placeholder="Passcode"><button class="btn glow">Unlock</button><div class="err" id="err"></div></form>`
    : `<form class="login" id="lf"><div class="art">✦</div><h1>Set up Hub</h1><p class="sub" style="margin:0">Enter the setup code shown on your PC, then choose a passcode (6+ characters).</p><input id="sc" placeholder="Setup code" autocomplete="off" autocapitalize="off"><input id="pc" type="password" autocomplete="new-password" placeholder="New passcode"><button class="btn glow">Create</button><div class="err" id="err"></div></form>`;
  $('#lf').onsubmit = async (e) => {
    e.preventDefault();
    $('#err').textContent = '';
    try {
      const r = await fetch(st.setUp ? '/api/login' : '/api/setup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ passcode: $('#pc').value, setupCode: $('#sc')?.value.trim() }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Try again');
      start();
    } catch (err) {
      $('#err').textContent = err.message;
    }
  };
}

// ---------- tabs ----------
let tab = localStorage.getItem('hub.tab') || 'jarvis';
function start() {
  $('#tabs').hidden = false;
  go(tab);
}
function go(name) {
  tab = name;
  localStorage.setItem('hub.tab', name);
  document.body.dataset.tab = name;
  $('#view').dataset.tab = name;
  $('#view').className = '';
  clearInterval(heroTimer);
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  $('#view').scrollTop = 0;
  ({ jarvis, home, tv, music, games, circle })[name]().catch((e) => e.message !== 'Signed out' && tab === name && $('#view').dataset.tab === name && toast(e.message));
}
document.querySelectorAll('#tabs button').forEach((b) => (b.onclick = () => go(b.dataset.tab)));


// ---------- Circle: your social app and messages, embedded (it keeps its own sign-in) ----------
const CIRCLE_URL = 'https://circle.arjun-hub.workers.dev/';
async function circle() {
  $('#view').innerHTML = `<iframe class="circle-frame" src="${CIRCLE_URL}" title="Circle" allow="clipboard-write; web-share; notifications"></iframe>`;
}

// ---------- actions Jarvis can hand back ----------
const SEARCH = {
  Netflix: (q) => `https://www.netflix.com/search?q=${encodeURIComponent(q)}`, Hulu: (q) => `https://www.hulu.com/search?q=${encodeURIComponent(q)}`,
  'Disney+': (q) => `https://www.disneyplus.com/search?q=${encodeURIComponent(q)}`, 'Prime Video': (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}&i=instant-video`,
  'Paramount+': (q) => `https://www.paramountplus.com/search/?q=${encodeURIComponent(q)}`, Peacock: (q) => `https://www.peacocktv.com/watch/search?q=${encodeURIComponent(q)}`,
  'Apple TV+': (q) => `https://tv.apple.com/search?term=${encodeURIComponent(q)}`, YouTube: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
};
const ytMusic = (q) => `https://music.youtube.com/search?q=${encodeURIComponent(q)}`;
const webLink = (q) => (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(q) ? `https://${q}` : `https://www.bing.com/search?q=${encodeURIComponent(q)}`);
function actionLink(a) {
  if (!a) return null;
  if (a.type === 'music') return [`▶  Play “${a.query}”`, ytMusic(a.query)];
  if (a.type === 'watch') return [`▶  Watch on ${a.service || 'your services'}`, (SEARCH[a.service] || SEARCH.YouTube)(a.title)];
  if (a.type === 'web') return [`↗  Open ${a.query}`, webLink(a.query)];
  if (a.type === 'game') return [`◈  Find ${a.name}`, `https://apps.apple.com/us/search?term=${encodeURIComponent(a.name)}`];
  return null;
}
const WX = { 0: ['Clear', '☀'], 1: ['Mostly clear', '🌤'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁'], 45: ['Fog', '🌫'], 48: ['Fog', '🌫'], 51: ['Drizzle', '🌦'], 53: ['Drizzle', '🌦'], 55: ['Drizzle', '🌦'], 61: ['Rain', '🌧'], 63: ['Rain', '🌧'], 65: ['Heavy rain', '🌧'], 71: ['Snow', '🌨'], 73: ['Snow', '🌨'], 75: ['Heavy snow', '❄'], 80: ['Showers', '🌦'], 81: ['Showers', '🌧'], 82: ['Storms', '⛈'], 95: ['Thunderstorms', '⛈'], 96: ['Thunderstorms', '⛈'], 99: ['Thunderstorms', '⛈'] };
const wx = (c) => WX[c] || ['Fair', '🌤'];
const daypart = () => { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; };

// ---------- Jarvis: the desktop HUD's arc reactor, its British voice and memory ----------
// iOS only lets audio play after a tap, so one <audio> is unlocked on each tap and reused.
const voiceOut = new Audio();
const SILENT = (() => {
  const b = new Uint8Array(48), d = new DataView(b.buffer), s = (o, t) => [...t].forEach((c, i) => (b[o + i] = c.charCodeAt(0)));
  s(0, 'RIFF'); d.setUint32(4, 40, true); s(8, 'WAVEfmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
  d.setUint32(24, 8000, true); d.setUint32(28, 16000, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); s(36, 'data'); d.setUint32(40, 4, true);
  return 'data:audio/wav;base64,' + btoa(String.fromCharCode(...b));
})();
const unlockAudio = () => { voiceOut.src = SILENT; voiceOut.play().catch(() => {}); };
let muted = localStorage.getItem('hub.mute') === '1';
const chatLog = JSON.parse(localStorage.getItem('hub.chat') || '[]');

async function jarvis() {
  const v = $('#view');
  v.innerHTML = `<div class="jv">
    <header class="jv-top"><span class="jv-tag">J.A.R.V.I.S.</span><span class="jv-sys" id="jsys">ONLINE</span>
      <button class="jv-ib" id="jmem" aria-label="Memory">◇</button><button class="jv-ib" id="jmute" aria-label="Voice">${muted ? '🔇' : '🔊'}</button></header>
    <div class="reactor" id="reactor"><i class="o a"></i><i class="o b"></i><i class="o c"></i><i class="tick"></i><div class="core"></div><small id="jstate">STANDBY</small><span class="nd n1"></span><span class="nd n2"></span><span class="nd n3"></span></div>
    <div class="jv-greet" id="jgreet"><h1>Good ${daypart()}, <span>Arjun</span>.</h1><p id="jwx">I’m J.A.R.V.I.S. — how can I help?</p></div>
    <div class="jv-chips" id="jchips">${['Brief me', 'Weather today', 'Play something chill', 'What’s new in games'].map((c) => `<button>${c}</button>`).join('')}</div>
    <div class="chat" id="chat"></div>
  </div>
  <form class="composer jv-comp" id="cf"><button type="button" class="mic" id="mic" aria-label="Talk"><i></i></button><input id="ci" placeholder="Speak or type to Jarvis…" autocomplete="off" enterkeyhint="send"><button class="send" aria-label="Send">↑</button></form>`;
  const chat = $('#chat');
  const state = (s) => {
    $('#reactor').className = 'reactor ' + s.toLowerCase();
    $('#jstate').textContent = s;
  };
  const tick = () => ($('#jsys') ? ($('#jsys').textContent = `ONLINE · ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`) : null);
  tick();
  api('/api/weather').then((w) => w && $('#jwx') && ($('#jwx').textContent = `It’s ${w.temp}° and ${wx(w.code)[0].toLowerCase()} in ${w.city}, sir. Today ${w.days[0].high}° / ${w.days[0].low}°.`)).catch(() => {});
  const add = (role, text, action) => {
    const d = document.createElement('div');
    d.className = 'msg ' + (role === 'user' ? 'me' : 'j');
    if (role !== 'user') d.innerHTML = '<small>JARVIS</small>';
    d.append(text);
    const link = actionLink(action);
    if (link) {
      const a = document.createElement('a');
      a.className = 'act';
      a.href = link[1];
      a.textContent = link[0];
      d.append(a);
    }
    chat.append(d);
    v.classList.toggle('talking', chat.children.length > 0);
    v.scrollTop = v.scrollHeight;
  };
  chatLog.forEach((m) => add(m.role, m.content, m.action));
  const say = async (text) => {
    if (muted) return state('STANDBY');
    state('SPEAKING');
    try {
      const r = await fetch('/api/speak', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
      if (!r.ok) throw new Error();
      voiceOut.src = URL.createObjectURL(await r.blob());
      voiceOut.onended = () => state('STANDBY');
      await voiceOut.play();
    } catch {
      // Gemini voice busy: fall back to the iPhone's British voice
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-GB';
      u.voice = speechSynthesis.getVoices().find((x) => /en-GB/i.test(x.lang) && /Daniel|Arthur|Male/i.test(x.name)) || speechSynthesis.getVoices().find((x) => /en-GB/i.test(x.lang)) || null;
      u.onend = () => state('STANDBY');
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    }
  };
  const ask = async (text, spoken) => {
    if (!text.trim()) return;
    chatLog.push({ role: 'user', content: text });
    add('user', text);
    state('THINKING');
    const r = await api('/api/jarvis', { voice: spoken, messages: chatLog.map(({ role, content }) => ({ role, content })) }).catch((e) => ({ reply: e.message }));
    chatLog.push({ role: 'assistant', content: r.reply, action: r.action });
    localStorage.setItem('hub.chat', JSON.stringify(chatLog.slice(-40)));
    add('assistant', r.reply, r.action);
    say(r.reply);
  };
  $('#cf').onsubmit = (e) => {
    e.preventDefault();
    unlockAudio();
    const t = $('#ci').value;
    $('#ci').value = '';
    $('#ci').blur();
    ask(t, false);
  };
  $('#jchips').querySelectorAll('button').forEach((b) => (b.onclick = () => { unlockAudio(); ask(b.textContent === 'Brief me' ? 'Give me my briefing: weather, anything notable today, and a headline or two.' : b.textContent, true); }));
  $('#jmute').onclick = () => {
    muted = !muted;
    localStorage.setItem('hub.mute', muted ? '1' : '0');
    $('#jmute').textContent = muted ? '🔇' : '🔊';
    if (muted) { voiceOut.pause(); speechSynthesis.cancel(); state('STANDBY'); }
  };
  $('#jmem').onclick = async () => {
    const { facts } = await api('/api/memory');
    sheet(`<h3>Jarvis remembers</h3><p>Tell Jarvis “remember that…” to add something.</p><div class="mem">${facts.length ? facts.map((f) => `<div class="card wtab"><div><b>${esc(f)}</b></div><button class="x" data-f="${esc(f)}">✕</button></div>`).join('') : '<div class="empty">Nothing yet.</div>'}</div>
      <div class="acts"><button class="btn ghost" id="jclear">Clear this conversation</button></div>`, (s) => {
      s.querySelectorAll('[data-f]').forEach((b) => (b.onclick = async () => { await api('/api/memory/forget', { fact: b.dataset.f }); b.parentElement.remove(); }));
      s.querySelector('#jclear').onclick = () => { chatLog.length = 0; localStorage.removeItem('hub.chat'); s.hidden = true; jarvis(); };
    });
  };
  // Like desktop Jarvis: record, then Gemini transcribes. (iPhone's own speech recognition
  // often fails silently in Home Screen apps.) Stops by itself after you stop talking.
  let rec = null;
  $('#mic').onclick = async () => {
    unlockAudio();
    if (rec) return rec.stop();
    voiceOut.pause();
    speechSynthesis.cancel();
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      return toast('Allow the microphone for Hub in Settings › Safari');
    }
    const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
    rec = new MediaRecorder(stream, type ? { mimeType: type } : {});
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    // silence detection: stop ~1.3s after speech ends, or after 15s
    const ctx = new AudioContext();
    const an = ctx.createAnalyser();
    ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Uint8Array(an.fftSize);
    let spoke = false, quietSince = Date.now();
    const started = Date.now();
    const watch = setInterval(() => {
      an.getByteTimeDomainData(buf);
      const level = Math.sqrt(buf.reduce((s, v) => s + (v - 128) ** 2, 0) / buf.length);
      if (level > 6) { spoke = true; quietSince = Date.now(); }
      if ((spoke && Date.now() - quietSince > 1300) || Date.now() - started > 15000 || (!spoke && Date.now() - started > 7000)) rec?.stop();
    }, 100);
    rec.onstop = async () => {
      clearInterval(watch);
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
      rec = null;
      $('#mic').classList.remove('on');
      if (!spoke) return state('STANDBY'), toast('Didn’t hear anything');
      state('THINKING');
      const blob = new Blob(chunks, { type: (type || 'audio/mp4').split(';')[0] });
      const r = await fetch('/api/hear', { method: 'POST', headers: { 'content-type': blob.type }, body: blob }).then((x) => x.json()).catch(() => ({ error: 'Couldn’t reach Hub' }));
      if (!r.text) return state('STANDBY'), toast(r.error || 'Didn’t catch that');
      ask(r.text, true);
    };
    rec.start();
    state('LISTENING');
    $('#mic').classList.add('on');
  };
}

// ---------- Home: Weber's new-tab page (greeting, search, favorites, weather, today's stories) ----------
const TOPIC = { Movies: '#ff4f7b', Games: '#7b5cff', Science: '#2fd6a3', Tech: '#4fb4ff' };
let homeTopic = 'All';
async function home() {
  const v = $('#view');
  const now = new Date();
  v.innerHTML = `<div class="wb">
    <div class="wb-top"><h1>${['Good night', 'Good morning', 'Good afternoon', 'Good evening'][now.getHours() < 5 ? 0 : now.getHours() < 12 ? 1 : now.getHours() < 17 ? 2 : 3]}</h1><p><b>${now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</b><span>${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></p></div>
    <form class="wb-search" id="hf"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg><input id="hq" placeholder="Search the web or type an address" enterkeyhint="go" autocomplete="off" autocapitalize="off"></form>
    <div class="wb-rail">${[['YouTube', 'youtube.com', '#ff0033'], ['Reddit', 'reddit.com', '#ff4500'], ['Gmail', 'mail.google.com', '#ea4335'], ['X', 'x.com', '#222'], ['Amazon', 'amazon.com', '#ff9900'], ['ESPN', 'espn.com', '#d00']].map(([n, u, c]) => `<a href="https://${u}" style="--c:${c}"><i><img src="https://www.google.com/s2/favicons?domain=${u}&sz=64" alt=""></i><span>${n}</span></a>`).join('')}</div>
    <div id="hwx"></div>
    <h2 class="wb-h">Today</h2><div class="wb-pills" id="hp">${['All', ...Object.keys(TOPIC)].map((t) => `<button class="${t === homeTopic ? 'on' : ''}" style="--c:${TOPIC[t] || '#fff'}">${t}</button>`).join('')}</div>
    <div id="hb"><div class="empty">Loading…</div></div></div>`;
  $('#hf').onsubmit = (e) => {
    e.preventDefault();
    const q = $('#hq').value.trim();
    if (q) location.href = webLink(q);
  };
  const d = await api('/api/home');
  const w = d.weather;
  if (w) $('#hwx').innerHTML = `<div class="wb-wx"><div class="now"><span class="ic">${wx(w.code)[1]}</span><b>${w.temp}°</b><div><strong>${esc(wx(w.code)[0])}</strong><small>${esc(w.city)}</small></div></div><div class="days">${w.days.slice(1, 5).map((x) => `<span>${new Date(x.day + 'T12:00').toLocaleDateString([], { weekday: 'short' })}<i>${wx(x.code)[1]}</i><b>${x.high}°</b></span>`).join('')}</div></div>`;
  const draw = () => {
    const list = d.stories.filter((s) => homeTopic === 'All' || s.topic === homeTopic);
    const [lead, ...rest] = list;
    $('#hb').innerHTML = lead
      ? `<a class="wb-lead" href="${esc(lead.url)}" style="background-image:url('${esc(lead.image || '')}')"><span class="tg" style="--t:${TOPIC[lead.topic]}">${esc(lead.topic)}</span><b>${esc(lead.title)}</b><small>${esc(lead.source)}</small></a>` +
        `<div class="wb-list">${rest.map((s) => `<a href="${esc(s.url)}"><div class="th" style="background-image:url('${esc(s.image || '')}')"></div><div><span style="color:${TOPIC[s.topic]}">${esc(s.topic)} · ${esc(s.source)}</span><b>${esc(s.title)}</b></div></a>`).join('')}</div>`
      : '<div class="empty">Nothing here right now.</div>';
  };
  draw();
  $('#hp').querySelectorAll('button').forEach((b) => (b.onclick = () => { homeTopic = b.textContent; $('#hp').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
}

// ---------- TV: Streamer's cinematic home (shows open in each service's iPhone app) ----------
const SVC_HOME = { netflix: 'https://www.netflix.com', disney: 'https://www.disneyplus.com', hulu: 'https://www.hulu.com', prime: 'https://www.amazon.com/gp/video/storefront', paramount: 'https://www.paramountplus.com', peacock: 'https://www.peacocktv.com', appletv: 'https://tv.apple.com', youtube: 'https://www.youtube.com' };
let heroTimer;
async function tv() {
  const v = $('#view');
  v.innerHTML = `<div class="st"><div class="st-hero" id="sth"><div class="empty">Loading…</div></div><div id="tvb"></div></div>`;
  const d = await api('/api/tv');
  if (!d.rows.length) return ($('#sth').innerHTML = '<div class="empty">Your shows will appear after the first sync from your PC.</div>');
  const svcOf = {};
  d.rows.forEach((r) => r.shows.forEach((s) => (svcOf[s.id] = r)));
  const small = (u) => String(u || '').replace('/original_untouched/', '/medium_portrait/');
  const poster = (s) => `<button class="st-poster" data-id="${s.id}"><img loading="lazy" src="${esc(small(s.poster))}" alt=""><i class="s-dot" style="--c:${svcOf[s.id]?.color || '#444'}"></i><span>${esc(s.name)}</span></button>`;
  const all = {};
  [...d.top, ...d.rows.flatMap((r) => r.shows)].forEach((s) => (all[s.id] = s));
  $('#tvb').innerHTML =
    `<h2>Your services</h2><div class="row st-svcs">${d.rows.map((r) => `<a class="st-svc" href="${SVC_HOME[r.id] || '#'}" style="--c:${r.color}"><b>${esc(r.name)}</b></a>`).join('')}</div>` +
    `<h2>Top picks for you</h2><div class="row">${d.top.slice(5).map(poster).join('')}</div>` +
    d.rows.map((r) => `<h2><i style="--c:${r.color}"></i>${esc(r.name)}</h2><div class="row">${r.shows.map(poster).join('')}</div>`).join('');
  // hero: the first five top picks with backdrops, rotating like the desktop app
  const heroes = d.top.slice(0, 5);
  const info = {};
  (await api(`/api/tv/info?ids=${heroes.map((s) => s.id).join(',')}`).catch(() => [])).forEach((x) => (info[x.id] = x));
  let i = 0;
  const show = () => {
    const s = heroes[i], x = info[s.id] || {}, svc = svcOf[s.id] || {};
    $('#sth').innerHTML = `<div class="bg" style="background-image:url('${esc(x.backdrop || s.poster)}')"></div>
      <div class="info"><span class="badge"><i style="--c:${svc.color || '#888'}"></i>${esc(svc.name || 'Top pick')}</span><h1>${esc(s.name)}</h1>
      <div class="meta">${x.rating ? `<span class="star">★ ${x.rating}</span>` : ''}${x.year ? `<span>${x.year}</span>` : ''}${(x.genres || []).slice(0, 2).map((g) => `<span>${esc(g)}</span>`).join('')}</div>
      ${x.summary ? `<p>${esc(x.summary)}</p>` : ''}<div class="actions"><a class="sbtn play" href="${esc(s.link)}">▶ Watch</a><button class="sbtn ghost" data-id="${s.id}">More info</button></div></div>
      <div class="dots">${heroes.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>`;
    $('#sth [data-id]').onclick = () => detail(s);
  };
  const detail = async (s) => {
    const x = info[s.id] || (await api(`/api/tv/info?ids=${s.id}`).catch(() => []))[0] || {};
    const svc = svcOf[s.id] || {};
    sheet(`<div class="st-detail" style="background-image:url('${esc(x.backdrop || s.poster)}')"></div><h3>${esc(s.name)}</h3><div class="meta">${x.rating ? `<span class="star">★ ${x.rating}</span>` : ''}${x.year ? `<span>${x.year}</span>` : ''}${(x.genres || []).slice(0, 3).map((g) => `<span>${esc(g)}</span>`).join('')}</div><p>${esc(x.summary || '')}</p><div class="acts"><a class="btn" href="${esc(s.link)}">▶ Watch on ${esc(svc.name || 'its app')}</a></div>`);
  };
  show();
  clearInterval(heroTimer);
  heroTimer = setInterval(() => { if (!$('#sth')) return clearInterval(heroTimer); i = (i + 1) % heroes.length; show(); }, 7000);
  $('#tvb').querySelectorAll('.st-poster').forEach((b) => (b.onclick = () => detail(all[b.dataset.id])));
}

// ---------- Music: Listener's look and your Listener library; songs play in YouTube Music ----------
// The library syncs from Listener on the PC (and stays here when it's off). Tapping a song
// hands it to the YouTube Music app with your account: Premium, no ads, plays when locked.
const MOODS = [['Chill', '#3d7bff', '#7b5cff'], ['Hype', '#ff3d6e', '#ffb03a'], ['Focus', '#14b8a6', '#3d7bff'], ['Workout', '#ff4f00', '#ff2d87'], ['Throwbacks', '#8b5cf6', '#ec4899'], ['Late night', '#1e1b4b', '#6d28d9']];
const L = { lib: null, lists: [], view: 'now', last: JSON.parse(localStorage.getItem('hub.last') || 'null') };
const fmt = (s) => (s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '');
// with a playlist id, YouTube Music keeps playing that playlist; without one it starts a radio
const ytmWatch = (id, list) => `https://music.youtube.com/watch?v=${encodeURIComponent(id)}${list ? `&list=${encodeURIComponent(list)}` : ''}`;

async function music() {
  const v = $('#view');
  v.innerHTML = `<div class="ls lp">
    <div class="ls-head"><span class="strap">LISTENER</span><h1 id="lh">Listen Now</h1></div>
    <div id="lnp"></div>
    <nav class="ls-seg" id="lseg">${[['now', 'Listen Now'], ['lib', 'Library'], ['search', 'Search']].map(([k, n]) => `<button data-v="${k}" class="${L.view === k ? 'on' : ''}">${n}</button>`).join('')}</nav>
    <div id="lsb"><div class="empty">Loading…</div></div></div>`;
  $('#lseg').querySelectorAll('button').forEach((b) => (b.onclick = () => show(b.dataset.v)));
  $('#lsb').onclick = onListClick;
  L.lib = await api('/api/listen').catch(() => ({ home: [], liked: [], playlists: [] }));
  if (!$('#lsb')) return;
  drawLast();
  show(L.view);
}

// songs are real links (iPhone opens YouTube Music most reliably from a tapped link);
// a tap just remembers the song for the Last Played card
function remember(list, i) {
  const t = list?.tracks[i];
  if (!t) return;
  L.last = { ...t, list: list.id || null };
  localStorage.setItem('hub.last', JSON.stringify(L.last));
}
const songHref = (k, i) => esc(ytmWatch(L.lists[k].tracks[i].id, L.lists[k].id));
// the last song you opened, Listener-style, with lyrics to read along
function drawLast() {
  const t = L.last;
  if (!t || !$('#lnp')) return;
  $('#lnp').innerHTML = `<div class="np"><div class="np-bg" style="background-image:url('${esc(t.art || '')}')"></div>
    <div class="np-row"><img src="${esc(t.art || '')}" alt=""><div class="np-t"><span class="strap">LAST PLAYED</span><b>${esc(t.t)}</b><small>${esc(t.a)}</small></div></div>
    <div class="np-acts"><a class="lbtn" href="${ytmWatch(t.id, t.list)}">▶ Play again</a><button class="lbtn ghost" id="llyr">❝ Lyrics</button></div></div>`;
  $('#llyr').onclick = () => showLyrics(t);
}
async function showLyrics(t) {
  sheet(`<h3>${esc(t.t)}</h3><p>${esc(t.a)}</p><div class="lyr"><div class="empty">Finding lyrics…</div></div>`);
  const r = await api(`/api/listen/lyrics?t=${encodeURIComponent(t.t)}&a=${encodeURIComponent(t.a)}&d=${t.d || 0}`).catch(() => null);
  const box = document.querySelector('.lyr');
  if (!box) return;
  const lines = r?.synced ? r.synced.split('\n').map((s) => s.replace(/^\[[\d:.]+\]\s*/, '')) : null;
  box.innerHTML = lines ? lines.map((l) => `<p class="on">${esc(l) || '♪'}</p>`).join('') : r?.plain ? `<pre>${esc(r.plain)}</pre>` : '<div class="empty">No lyrics found for this one.</div>';
}

// ----- lists and views -----
const row = (x, l, i) => `<a class="trk${L.last?.id === x.id ? ' on' : ''}" href="${songHref(l, i)}" data-l="${l}" data-i="${i}"><img loading="lazy" src="${esc(x.art || '')}" alt=""><div><b>${esc(x.t)}</b><small>${esc(x.a)}</small></div><span>${fmt(x.d)}</span></a>`;
const reg = (tracks, id = null) => (L.lists.push({ id, tracks }), L.lists.length - 1);
function onListClick(e) {
  const b = e.target.closest('[data-l]');
  if (b) return remember(L.lists[b.dataset.l], Number(b.dataset.i || 0));
  const p = e.target.closest('[data-pl]');
  if (p) return openList(p.dataset.pl === 'liked' ? { id: 'LM', title: 'Liked Songs', sub: 'Your likes on YouTube Music', tracks: L.lib.liked, art: L.lib.liked[0]?.art } : findList(p.dataset.pl));
  const c = e.target.closest('[data-q]');
  if (c && c.tagName !== 'A') location.href = ytMusic(c.dataset.q);
}
const findList = (id) => L.lib.playlists.find((p) => p.id === id) || L.lib.home.map((s) => s.list).find((x) => x?.id === id);
function show(view) {
  L.view = view;
  L.lists = [];
  $('#lseg').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === view));
  $('#lh').textContent = { now: 'Listen Now', lib: 'Library', search: 'Search' }[view];
  ({ now: viewNow, lib: viewLib, search: viewSearch })[view]();
}
function synced() {
  return L.lib?.at ? `<p class="ls-sync">Synced from Listener ${new Date(L.lib.at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })} · songs open in YouTube Music</p>` : '<div class="card ls-note"><b>Open Listener on your PC once</b><small>Your home, liked songs and playlists copy here automatically while Listener is open, and stay here when the PC is off.</small></div>';
}
function viewNow() {
  const cards = (s) => {
    if (s.list) return `<button class="ls-card" data-pl="${esc(s.list.id)}"><div class="art"><img loading="lazy" src="${esc(s.list.art || s.list.tracks[0]?.art || '')}" alt=""></div><b>${esc(s.title)}</b><small>${s.list.tracks.length} songs</small></button>`;
    const k = reg(s.songs);
    return s.songs.map((x, i) => `<a class="ls-card" href="${songHref(k, i)}" data-l="${k}" data-i="${i}"><div class="art"><img loading="lazy" src="${esc(x.art || '')}" alt=""><i class="play">▶</i></div><b>${esc(x.t)}</b><small>${esc(x.a)}</small></a>`).join('');
  };
  const lists = L.lib.home.filter((s) => s.list);
  $('#lsb').innerHTML = synced() +
    L.lib.home.filter((s) => s.songs).map((s) => `<section class="shelf">${s.strap ? `<span class="strap">${esc(s.strap.toUpperCase())}</span>` : ''}<h2>${esc(s.title)}</h2><div class="row">${cards(s)}</div></section>`).join('') +
    (lists.length ? `<section class="shelf"><h2>Mixes & playlists for you</h2><div class="row">${lists.map(cards).join('')}</div></section>` : '') +
    `<section class="shelf"><h2>Top songs in the US</h2><div class="row" id="lcharts"></div></section>` +
    `<section class="shelf"><h2>Moods & moments</h2><div class="ls-moods">${MOODS.map(([n, a, b]) => `<a href="${esc(ytMusic(n + ' mix'))}" style="--a:${a};--b:${b}"><b>${n}</b></a>`).join('')}</div></section>`;
  api('/api/music').then((d) => $('#lcharts') && ($('#lcharts').innerHTML = d.songs.slice(0, 20).map((x, k) => `<a class="ls-card" href="${esc(ytMusic(`${x.name} ${x.artist}`))}"><div class="art"><img loading="lazy" src="${esc(x.art)}" alt=""><em>${k + 1}</em></div><b>${esc(x.name)}</b><small>${esc(x.artist)}</small></a>`).join(''))).catch(() => {});
}
function viewLib() {
  const lists = [...L.lib.playlists, ...L.lib.home.map((s) => s.list).filter(Boolean)];
  $('#lsb').innerHTML = synced() +
    `<button class="card ls-liked" data-pl="liked"><i>♥</i><div><b>Liked Songs</b><small>${L.lib.liked.length} songs</small></div><span>›</span></button>` +
    (lists.length ? `<h2>Playlists</h2><div class="ls-grid">${lists.map((p) => `<button class="ls-card" data-pl="${esc(p.id)}"><div class="art"><img loading="lazy" src="${esc(p.art || p.tracks[0]?.art || '')}" alt=""></div><b>${esc(p.title)}</b><small>${p.tracks.length} songs</small></button>`).join('')}</div>` : '');
}
function openList(p) {
  if (!p) return;
  const k = reg(p.tracks, p.id);
  $('#lsb').innerHTML = `<button class="ls-back" id="lback">‹ Back</button>
    <div class="ls-lhead"><img src="${esc(p.art || p.tracks[0]?.art || '')}" alt=""><div><b>${esc(p.title)}</b><small>${esc(p.sub || '')} · ${p.tracks.length} songs</small>
    <div class="ls-acts"><a class="lbtn" href="${songHref(k, 0)}" data-l="${k}" data-i="0">▶ Play</a>${(() => { const r = Math.floor(Math.random() * p.tracks.length); return `<a class="lbtn ghost" href="${songHref(k, r)}" data-l="${k}" data-i="${r}">⤮ Random start</a>`; })()}</div></div></div>
    <div class="trks">${p.tracks.map((x, i) => row(x, k, i)).join('')}</div>`;
  $('#lback').onclick = () => show(L.view);
  $('#view').scrollTo({ top: $('#lseg').offsetTop - 10, behavior: 'smooth' });
}
function viewSearch() {
  $('#lsb').innerHTML = `<form class="ls-search" id="mf"><i>⌕</i><input id="mq" placeholder="Songs, artists, albums" enterkeyhint="search" autocomplete="off"></form><div id="lres"></div>`;
  const mine = [...L.lib.liked, ...L.lib.playlists.flatMap((p) => p.tracks), ...L.lib.home.flatMap((s) => s.songs || s.list?.tracks || [])].filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i);
  $('#mq').oninput = () => {
    const q = $('#mq').value.trim();
    if (q.length < 2) return ($('#lres').innerHTML = '');
    const hits = mine.filter((x) => `${x.t} ${x.a}`.toLowerCase().includes(q.toLowerCase())).slice(0, 20);
    L.lists = [];
    const k = reg(hits);
    $('#lres').innerHTML = `<a class="card ls-liked" href="${esc(ytMusic(q))}"><i>⌕</i><div><b>Search YouTube Music</b><small>“${esc(q)}”</small></div><span>↗</span></a>` +
      (hits.length ? `<h2>In your library</h2><div class="trks">${hits.map((x, i) => row(x, k, i)).join('')}</div>` : '');
  };
  $('#mf').onsubmit = (e) => {
    e.preventDefault();
    const q = $('#mq').value.trim();
    if (q) location.href = ytMusic(q);
  };
  $('#mq').focus();
}

// ---------- Games: Gamer's console dashboard (full-screen art of the focused game) ----------
const POPULAR = [
  ['Roblox', 'roblox://', 'https://apps.apple.com/app/id431946152'], ['Fortnite', 'fortnite://', 'https://www.fortnite.com/mobile'], ['Minecraft', 'minecraft://', 'https://apps.apple.com/app/id479516143'],
  ['Clash Royale', 'clashroyale://', 'https://apps.apple.com/app/id1053012308'], ['Brawl Stars', 'brawlstars://', 'https://apps.apple.com/app/id1229016807'], ['Clash of Clans', 'clashofclans://', 'https://apps.apple.com/app/id529479190'],
  ['EA SPORTS FC Mobile', '', 'https://apps.apple.com/us/search?term=EA%20SPORTS%20FC%20Mobile'], ['NBA 2K Mobile', '', 'https://apps.apple.com/us/search?term=NBA%202K'], ['Xbox Cloud Gaming', 'https://www.xbox.com/play', 'https://www.xbox.com/play'],
];
const hue = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
let gameFilter = 'All';
async function games() {
  const v = $('#view');
  v.innerHTML = `<div class="gm"><div class="gm-bg" id="gbg"></div>
    <header class="gm-top"><nav class="gm-tabs" id="gtabs">${['All', 'iPhone', 'PC'].map((t) => `<button class="${t === gameFilter ? 'on' : ''}">${t}</button>`).join('')}</nav><span class="gm-clock">${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></header>
    <div class="gm-feature" id="gft"></div><div id="gb"><div class="empty">Loading…</div></div></div>`;
  const d = await api('/api/games');
  const phone = d.phone.map((g) => ({ ...g, kind: 'iPhone', open: g.link || g.store }));
  const pc = d.pc.map((g) => ({ name: g.title, cover: g.cover, kind: 'PC', open: `https://www.xbox.com/play/search?q=${encodeURIComponent(g.title)}` }));
  const art = (g) => g.cover || g.icon || '';
  const focus = (g) => {
    if (!g) return;
    $('#gbg').classList.toggle('icon', !g.cover);
    $('#gbg').style.backgroundImage = art(g) ? `url('${art(g).replace(/'/g, '%27')}')` : `linear-gradient(160deg, hsl(${hue(g.name)} 35% 28%), #0b0c0e)`;
    $('#gft').innerHTML = `<b class="t">${esc(g.name)}</b><div class="m"><span><b>${g.kind === 'PC' ? 'PC library' : 'On this iPhone'}</b></span>${g.genre ? `<span>${esc(g.genre)}</span>` : ''}</div>
      <a class="gbtn" href="${esc(g.open)}">${g.kind === 'PC' ? '☁ Play with Xbox Cloud' : '▶ Play'}</a>`;
  };
  const tile = (g, k) => `<button class="gm-tile ${g.kind === 'iPhone' ? 'app' : ''}" data-k="${k}"><div class="ar">${art(g) ? `<img loading="lazy" src="${esc(art(g))}" alt="">` : `<div class="fb" style="--h:${hue(g.name)}">${esc(g.name)}</div>`}${g.kind === 'iPhone' && g.icon ? `<div class="blur" style="background-image:url('${esc(g.icon)}')"></div>` : ''}<span class="badge">${g.kind}</span></div><span class="nm">${esc(g.name)}</span></button>`;
  const draw = () => {
    const list = [...(gameFilter !== 'PC' ? phone : []), ...(gameFilter !== 'iPhone' ? pc : [])];
    const rows = [];
    if (gameFilter !== 'PC') rows.push(`<section class="gm-row"><h2>On this iPhone</h2><div class="row">${phone.map((g) => tile(g, list.indexOf(g))).join('')}<button class="gm-tile add" id="add"><div class="ar"><div class="fb plus">＋<small>Add a game</small></div></div></button></div></section>`);
    if (gameFilter !== 'iPhone' && pc.length) rows.push(`<section class="gm-row"><h2>PC library <small>opens Xbox Cloud Gaming</small></h2><div class="row">${pc.map((g) => tile(g, list.indexOf(g))).join('')}</div></section>`);
    $('#gb').innerHTML = rows.join('');
    focus(list.find((g) => g.cover) || list.find(art) || list[0]);
    $('#gb').querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => {
      const g = list[b.dataset.k];
      if (b.classList.contains('sel')) return (location.href = g.open); // second tap plays
      $('#gb').querySelectorAll('.sel').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
      focus(g);
    }));
    $('#add')?.addEventListener('click', addGame);
  };
  const addGame = () =>
    sheet(`<h3>Add a game</h3><p>Hub finds its App Store icon. If a game can’t be opened directly, its App Store page opens instead.</p><div class="chips">${POPULAR.map((p, i) => `<button class="chip" data-i="${i}">${esc(p[0])}</button>`).join('')}</div><form class="field" id="gf" style="margin-top:14px"><input id="gn" placeholder="Other game name"><button class="btn">Add</button></form>`, (s) => {
      const save = async (g) => {
        s.hidden = true;
        toast('Adding…');
        await api('/api/games/phone', { games: [...d.phone, g] });
        games();
      };
      s.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => { const p = POPULAR[b.dataset.i]; save({ name: p[0], link: p[1], store: p[2] }); }));
      s.querySelector('#gf').onsubmit = (e) => {
        e.preventDefault();
        const n = s.querySelector('#gn').value.trim();
        if (n) save({ name: n, link: '', store: '' });
      };
    });
  draw();
  $('#gtabs').querySelectorAll('button').forEach((b) => (b.onclick = () => { gameFilter = b.textContent; $('#gtabs').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
}

login();
