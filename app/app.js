// GTA VI trophy guide + tracker: checklist saved in localStorage, export/import,
// filters by kind/grade/status/missable/search, spoiler mode hiding hidden story
// trophies until earned, detail panel with full guide + sources, roadmap in HTML.
// URL params (for deep links and screenshots): ?detail=<id> ?view=roadmap
// ?spoiler=on|off ?kind= ?grade= ?earned=1,2,3 (seeds earned set).
const KEY = 'gta6-trophy-checklist';
const SPOILER_KEY = 'gta6-trophy-spoiler';
const params = new URLSearchParams(location.search);
const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;

let earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
if (params.get('earned')) {
  for (const n of params.get('earned').split(',')) earned.add(Number(n));
  save();
}
let spoiler = params.get('spoiler') === 'off' ? false
  : params.get('spoiler') === 'on' ? true
  : (localStorage.getItem(SPOILER_KEY) ?? 'on') === 'on';

const $ = (id) => document.getElementById(id);
const listEl = $('list'), searchEl = $('search'), kindEl = $('kind'), gradeEl = $('grade'),
  statusEl = $('status'), missableEl = $('missableOnly'), spoilerEl = $('spoiler');
if (params.get('kind')) kindEl.value = params.get('kind');
if (params.get('grade')) gradeEl.value = params.get('grade');
spoilerEl.checked = spoiler;

function save() { localStorage.setItem(KEY, JSON.stringify([...earned].sort((a, b) => a - b))); }
function isHidden(t) { return spoiler && t.hidden && !earned.has(t.id); }
function displayName(t) { return isHidden(t) ? '🔒 Hidden trophy — earn it to reveal' : t.name; }
function displayDesc(t) { return isHidden(t) ? 'This story trophy stays hidden on PlayStation until you earn it.' : t.description; }

function renderProgress() {
  const total = trophies.length, n = earned.size, pct = Math.round((n / total) * 100);
  $('progressText').textContent = `${n} of ${total} earned — ${total - n} to go`;
  $('progressPct').textContent = `${pct}% to platinum`;
  $('progressBar').style.width = `${pct}%`;
  $('gradeStats').innerHTML = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const all = trophies.filter((t) => t.grade === g).length;
    const got = trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
    return `<span>${g}: ${got}/${all}</span>`;
  }).join('') + `<span>missable: ${trophies.filter((t) => t.missable && earned.has(t.id)).length}/1</span>`;
}

function showDetail(t) {
  document.querySelectorAll('.card').forEach((c) => c.classList.toggle('selected', Number(c.dataset.id) === t.id));
  $('detailTitle').textContent = `${isHidden(t) ? '🔒 Hidden trophy' : t.name} — ${t.grade} · ${t.kind}`;
  $('detailMeta').textContent = isHidden(t)
    ? 'Spoiler mode is hiding this story trophy. Earn it in-game (or turn spoiler mode off) to reveal its official name and description.'
    : `Official description: “${t.description}”`;
  $('detailGuide').textContent = isHidden(t) ? '' : t.guide;
  $('detailSources').textContent = isHidden(t) ? '' : `Sources: ${t.sources.join(' · ')}`;
  const old = document.querySelector('.missable-flag');
  if (old) old.remove();
  if (t.missable && !isHidden(t)) {
    const flag = document.createElement('span');
    flag.className = 'missable-flag';
    flag.textContent = '⚠ MISSABLE — meditate at Lucia’s balcony spot in Chapter 1 before the chapter ends. No mission replay.';
    $('detail').append(flag);
  }
}

function filtered() {
  const q = searchEl.value.trim().toLowerCase();
  return trophies.filter((t) => {
    if (kindEl.value !== 'all' && t.kind !== kindEl.value) return false;
    if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
    if (statusEl.value === 'earned' && !earned.has(t.id)) return false;
    if (statusEl.value === 'missing' && earned.has(t.id)) return false;
    if (missableEl.checked && !t.missable) return false;
    if (q && !(t.name + ' ' + t.description + ' ' + t.guide + ' ' + t.kind).toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderList() {
  const items = filtered();
  listEl.replaceChildren();
  $('countLine').textContent = `Showing ${items.length} of ${trophies.length} trophies — ${earned.size} earned`;
  for (const t of items) {
    const card = document.createElement('article');
    card.className = 'card' + (earned.has(t.id) ? ' earned' : '');
    card.dataset.id = t.id;
    const tick = document.createElement('label');
    tick.className = 'tick';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', `Mark ${t.name} earned`);
    box.addEventListener('change', (e) => {
      e.stopPropagation();
      if (box.checked) earned.add(t.id); else earned.delete(t.id);
      save(); renderProgress(); renderList();
    });
    tick.append(box, earned.has(t.id) ? 'Earned ✓' : 'Mark earned');
    const h = document.createElement('h3');
    h.textContent = displayName(t);
    const g = document.createElement('span');
    g.className = 'grade ' + t.grade;
    g.textContent = t.grade;
    h.append(g);
    const desc = document.createElement('p');
    desc.className = 'desc';
    desc.textContent = displayDesc(t);
    const guide = document.createElement('p');
    guide.className = 'guide-short';
    guide.textContent = isHidden(t) ? '' : t.guide;
    const tags = document.createElement('p');
    tags.className = 'tags';
    tags.innerHTML = '';
    tags.textContent = `#${t.id} · ${t.kind}${t.hidden ? ' · hidden' : ''}`;
    if (t.missable) {
      const m = document.createElement('span');
      m.className = 'miss';
      m.textContent = ' · ⚠ MISSABLE';
      tags.append(m);
    }
    card.append(tick, h, desc, guide, tags);
    card.addEventListener('click', (e) => {
      if (e.target === box) return;
      showDetail(t);
      $('detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    listEl.append(card);
  }
}

function renderAll() { renderProgress(); renderList(); }

$('export').addEventListener('click', () => {
  const payload = { game: 'Grand Theft Auto VI', platform: 'PlayStation 5', earned: [...earned].sort((a, b) => a - b), exported: new Date().toISOString() };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
$('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.earned;
    const valid = new Set(trophies.map((t) => t.id));
    earned = new Set(ids.filter((n) => valid.has(Number(n))).map(Number));
    save(); renderAll();
  } catch { alert('That file is not valid trophy progress JSON.'); }
  e.target.value = '';
});
$('reset').addEventListener('click', () => {
  if (!confirm('Clear all earned trophies?')) return;
  earned = new Set(); save(); renderAll();
});
for (const el of [searchEl, kindEl, gradeEl, statusEl, missableEl]) el.addEventListener('input', renderList);
spoilerEl.addEventListener('change', () => {
  spoiler = spoilerEl.checked;
  localStorage.setItem(SPOILER_KEY, spoiler ? 'on' : 'off');
  renderList();
});

renderAll();
const detailId = Number(params.get('detail'));
if (detailId) {
  const t = trophies.find((x) => x.id === detailId);
  if (t) { showDetail(t); $('detail').scrollIntoView(); }
}
if (params.get('view') === 'roadmap') $('roadmap').scrollIntoView();
