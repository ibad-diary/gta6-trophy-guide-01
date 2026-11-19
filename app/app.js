// Leonida Platinum: offline GTA VI trophy guide and tracker.
// Loads app/data/trophies.json (same origin, no network), saves progress in
// localStorage, and renders the tracker, roadmap and missable lists.
const PROGRESS_KEY = 'leonida-platinum-progress-v1';
const SPOILER_KEY = 'leonida-platinum-spoiler-v1';
const POINTS = { platinum: 300, gold: 90, silver: 30, bronze: 15 };
const DEMO_EARNED = [2, 3, 8, 10, 16, 19, 20, 21, 35, 36, 42, 52, 53];
const STAGES = [
  { n: 1, title: 'Stage 1 — Play the story', blurb: 'Chapters 1–4, the named story missions and the finale. The 15 story trophies come naturally; do the partner and secret moments listed in the pre-finale checklist before the final mission.' },
  { n: 2, title: 'Stage 2 — Strangers & side missions', blurb: 'The five named stranger finales plus three more strands for the silver, the unique-animal hunt, the partner trophies and the choice counter. Do strands as their icons appear.' },
  { n: 3, title: 'Stage 3 — Activities & skills', blurb: 'Shooting Range golds, drone races, races, fishing, arcade, bowling, combat feats and the activity sampler. Skill-based: save the 42 gold medals for when your shooting is at its best.' },
  { n: 4, title: 'Stage 4 — Collectibles & exploration', blurb: 'Cards, meditation spots, WAiNK locations, vehicles, areas, gangs, vaults, garages and the economy totals. Combine trips: one new area earns exploration, WAiNK, vehicle and meditation progress at once.' },
  { n: 5, title: 'Stage 5 — Clean-up & platinum', blurb: '100% completion, the last stunts, the last challenges and the platinum itself. Check the tracker against the in-game stats screen before declaring yourself done.' },
];
const PREFINALE = [33, 34, 37, 44, 45, 46, 47, 22, 23, 24, 26, 27, 29];

const $ = (id) => document.getElementById(id);
const listEl = $('list');
const detailEl = $('detail');
const params = new URLSearchParams(location.search);
let doc = null;
let earned = new Set();
let spoiler = false;
let selectedId = null;

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return new Set(JSON.parse(raw).filter((n) => typeof n === 'string'));
  } catch { /* corrupted save: start fresh */ }
  if (params.has('demo')) return new Set(DEMO_EARNED.map((id) => trophyById(id).name));
  return new Set();
}

function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify([...earned]));
}

function trophyById(id) {
  return doc.trophies.find((t) => t.id === id);
}

function sourceUrl(name) {
  const found = (doc.sources || []).find((s) => s.name === name);
  return found ? found.url : null;
}

function isSpoilerHidden(t) {
  return spoiler && t.hidden && !earned.has(t.name);
}

function gradeLabel(t) {
  return t.grade.charAt(0).toUpperCase() + t.grade.slice(1);
}

function kindLabel(kind) {
  const labels = { story: 'Story', mission: 'Story mission', stranger: 'Stranger strand', collectible: 'Collectible', activity: 'Activity', stunt: 'Stunts & races', combat: 'Combat', robbery: 'Robbery', economy: 'Economy', exploration: 'Exploration', secret: 'Secret' };
  return labels[kind] || kind;
}

function targetLabel(t) {
  if (!t.target) return '';
  if (t.id === 52 || t.id === 53) return 'Target: $' + t.target.toLocaleString('en-US');
  if (t.id === 14) return 'Target: 100% completion';
  return 'Target: ' + t.target.toLocaleString('en-US');
}

function matchesFilters(t) {
  const q = $('search').value.trim().toLowerCase();
  const kind = $('kind').value;
  const grade = $('grade').value;
  const status = $('status').value;
  if (kind === 'online') return false;
  if (kind !== 'all' && t.kind !== kind) return false;
  if (grade !== 'all' && t.grade !== grade) return false;
  if (status === 'earned' && !earned.has(t.name)) return false;
  if (status === 'remaining' && earned.has(t.name)) return false;
  if ($('missableOnly').checked && !t.missable) return false;
  if (q && !(t.name + ' ' + t.description + ' ' + t.guide + ' ' + t.kind).toLowerCase().includes(q)) return false;
  return true;
}

function renderProgress() {
  const total = doc.trophies.length;
  const pts = doc.trophies.reduce((s, t) => s + (earned.has(t.name) ? POINTS[t.grade] : 0), 0);
  $('earnedCount').textContent = earned.size;
  $('progressFill').style.width = Math.round((earned.size / total) * 100) + '%';
  $('pointsEarned').textContent = pts.toLocaleString('en-US');
  const counts = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const got = doc.trophies.filter((t) => t.grade === g && earned.has(t.name)).length;
    const all = doc.trophies.filter((t) => t.grade === g).length;
    return gradeLabel({ grade: g }) + ' ' + got + '/' + all;
  }).join(' · ');
  $('gradeCounts').textContent = counts;
  const next = doc.trophies.filter((t) => !earned.has(t.name)).sort((a, b) => a.stage - b.stage || a.id - b.id).slice(0, 3);
  $('nextUp').textContent = next.length ? 'Next up: ' + next.map((t) => t.name).join(' · ') : 'Platinum earned — Leonida Legend!';
  $('missableCount').textContent = '(' + doc.trophies.filter((t) => t.missable).length + ' flagged)';
}

function renderList() {
  const shown = doc.trophies.filter(matchesFilters);
  if ($('kind').value === 'online') {
    listEl.innerHTML = '<p class="empty">No online trophies in this list — all 55 trophies are earned in single-player. Nothing here needs PS Plus or another player.</p>';
  } else if (!shown.length) {
    listEl.innerHTML = '<p class="empty">No trophies match these filters.</p>';
  } else {
    listEl.replaceChildren();
    for (const t of shown) {
      listEl.append(makeTrophyCard(t));
    }
  }
  $('listHint').textContent = shown.length + ' of ' + doc.trophies.length + ' trophies shown · ' + earned.size + ' earned · click a trophy to read its guide';
  renderProgress();
}

function makeTrophyCard(t) {
  const hidden = isSpoilerHidden(t);
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'card g-' + t.grade + (earned.has(t.name) ? ' earned' : '') + (selectedId === t.id ? ' selected' : '');
  const row = document.createElement('span');
  row.className = 'trow';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(t.name);
  box.setAttribute('aria-label', 'Mark ' + t.name + ' earned');
  box.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (box.checked) earned.add(t.name);
    else earned.delete(t.name);
    saveProgress();
    renderList();
    renderDetail();
    renderRoadmap();
    renderMissables();
  });
  const body = document.createElement('span');
  const name = document.createElement('span');
  name.className = 'tname';
  name.textContent = hidden ? 'Hidden trophy — earn it to reveal' : t.name;
  const desc = document.createElement('span');
  desc.className = 'tdesc';
  desc.textContent = hidden ? 'Hidden on PlayStation until earned.' : t.description;
  const tags = document.createElement('span');
  tags.className = 'tags';
  const gradeTag = document.createElement('span');
  gradeTag.className = 'tag grade-' + t.grade;
  gradeTag.textContent = gradeLabel(t) + ' · ' + POINTS[t.grade] + ' pts';
  tags.append(gradeTag);
  const kindTag = document.createElement('span');
  kindTag.className = 'tag';
  kindTag.textContent = kindLabel(t.kind);
  tags.append(kindTag);
  if (t.missable) {
    const m = document.createElement('span');
    m.className = 'tag miss';
    m.textContent = 'Missable';
    tags.append(m);
  }
  if (t.hidden) {
    const h = document.createElement('span');
    h.className = 'tag hiddenTag';
    h.textContent = 'Hidden';
    tags.append(h);
  }
  if (t.target) {
    const tg = document.createElement('span');
    tg.className = 'tag';
    tg.textContent = targetLabel(t);
    tags.append(tg);
  }
  body.append(name, document.createElement('br'), desc, tags);
  row.append(box, body);
  card.append(row);
  card.addEventListener('click', () => {
    selectedId = t.id;
    renderList();
    renderDetail();
  });
  return card;
}

function renderDetail() {
  const t = selectedId ? trophyById(selectedId) : null;
  if (!t) {
    detailEl.innerHTML = '<p class="detailEmpty">Select a trophy to read its guide, sources and missable note.</p>';
    return;
  }
  detailEl.replaceChildren();
  const h = document.createElement('h2');
  h.textContent = isSpoilerHidden(t) ? 'Hidden trophy' : t.name;
  detailEl.append(h);
  const meta = document.createElement('p');
  meta.innerHTML = '';
  meta.textContent = gradeLabel(t) + ' · ' + POINTS[t.grade] + ' points · ' + kindLabel(t.kind) + (t.hidden ? ' · Hidden on PSN' : '');
  detailEl.append(meta);
  if (t.target) {
    const tg = document.createElement('p');
    tg.className = 'target';
    tg.textContent = targetLabel(t);
    detailEl.append(tg);
  }
  const off = document.createElement('p');
  off.className = 'official';
  off.textContent = isSpoilerHidden(t) ? 'Official description hidden until earned.' : 'Official description: "' + t.description + '"';
  detailEl.append(off);
  if (t.missable) {
    const w = document.createElement('p');
    w.className = 'warn';
    w.textContent = 'Missable — ' + t.missableReason;
    detailEl.append(w);
  } else {
    const ok = document.createElement('p');
    ok.textContent = 'Not missable — this can be finished in free roam after the story.';
    detailEl.append(ok);
  }
  const guideTitle = document.createElement('h3');
  guideTitle.textContent = 'Guide';
  detailEl.append(guideTitle);
  const guide = document.createElement('p');
  guide.className = 'guide';
  guide.textContent = isSpoilerHidden(t) ? 'Turn off the spoiler-free setting or earn this trophy to read its guide.' : t.guide;
  detailEl.append(guide);
  const srcTitle = document.createElement('h3');
  srcTitle.textContent = 'Sources';
  detailEl.append(srcTitle);
  const ul = document.createElement('ul');
  ul.className = 'src';
  for (const name of t.sources) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.textContent = name;
    const url = sourceUrl(name);
    if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; }
    li.append(a);
    ul.append(li);
  }
  detailEl.append(ul);
  const note = document.createElement('p');
  note.className = 'src';
  note.textContent = 'Guide text is our own words, written for this guide. The name and description above are the official ones as PlayStation publishes them.';
  detailEl.append(note);
}

function renderRoadmap() {
  const box = $('roadmap');
  box.replaceChildren();
  for (const stage of STAGES) {
    const div = document.createElement('div');
    div.className = 'stage';
    const h = document.createElement('h3');
    const done = doc.trophies.filter((t) => t.stage === stage.n && earned.has(t.name)).length;
    const all = doc.trophies.filter((t) => t.stage === stage.n).length;
    h.textContent = stage.title + ' — ' + done + '/' + all + ' earned';
    const p = document.createElement('p');
    p.className = 'lede';
    p.textContent = stage.blurb;
    const ol = document.createElement('ol');
    for (const t of doc.trophies.filter((x) => x.stage === stage.n)) {
      const li = document.createElement('li');
      if (earned.has(t.name)) li.className = 'done';
      li.textContent = (isSpoilerHidden(t) ? 'Hidden trophy' : t.name) + ' — ' + gradeLabel(t) + (t.missable ? ' · missable' : '') + (t.target ? ' · ' + targetLabel(t) : '');
      ol.append(li);
    }
    div.append(h, p, ol);
    box.append(div);
  }
  const pre = $('prefinale');
  pre.replaceChildren();
  for (const id of PREFINALE) {
    const t = trophyById(id);
    const li = document.createElement('li');
    if (earned.has(t.name)) li.className = 'done';
    li.textContent = (isSpoilerHidden(t) ? 'Hidden trophy' : t.name) + ': ' + t.missableReason;
    pre.append(li);
  }
}

function renderMissables() {
  const list = doc.trophies.filter((t) => t.missable);
  $('missableTotal').textContent = list.length + ' of 55';
  const box = $('missableList');
  box.replaceChildren();
  for (const t of list) {
    const div = document.createElement('div');
    div.className = 'missCard';
    const name = document.createElement('div');
    name.className = 'tname';
    name.textContent = (isSpoilerHidden(t) ? 'Hidden trophy' : t.name) + ' — ' + gradeLabel(t) + ' · ' + kindLabel(t.kind);
    const desc = document.createElement('div');
    desc.className = 'tdesc';
    desc.textContent = isSpoilerHidden(t) ? 'Hidden on PlayStation until earned.' : t.description;
    const why = document.createElement('p');
    why.textContent = t.missableReason;
    const state = document.createElement('p');
    state.textContent = earned.has(t.name) ? 'Earned ✓' : 'Not earned yet — do it before it passes.';
    div.append(name, desc, why, state);
    box.append(div);
  }
}

function exportProgress() {
  const data = { game: 'Grand Theft Auto VI', guide: 'Leonida Platinum', exportedAt: new Date().toISOString(), earned: [...earned] };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importProgress(file) {
  file.text().then((text) => {
    const data = JSON.parse(text);
    const names = Array.isArray(data) ? data : data.earned;
    const known = new Set(doc.trophies.map((t) => t.name));
    const good = (Array.isArray(names) ? names : []).filter((n) => known.has(n));
    if (!good.length) throw new Error('no known trophy names');
    earned = new Set(good);
    saveProgress();
    renderList();
    renderDetail();
    renderRoadmap();
    renderMissables();
  }).catch(() => {
    alert('That file is not a Leonida Platinum progress export.');
  });
}

function switchView(view) {
  for (const b of document.querySelectorAll('#tabs button')) {
    b.classList.toggle('active', b.dataset.view === view);
  }
  for (const v of ['tracker', 'roadmap', 'missables', 'about']) {
    $('view-' + v).hidden = v !== view;
  }
}

function applyParams() {
  if (params.get('view') && ['tracker', 'roadmap', 'missables', 'about'].includes(params.get('view'))) {
    switchView(params.get('view'));
  }
  if (params.get('kind')) $('kind').value = params.get('kind');
  if (params.get('grade')) $('grade').value = params.get('grade');
  if (params.get('spoilers') === 'on') spoiler = true;
  const open = Number(params.get('open'));
  if (open && trophyById(open)) selectedId = open;
}

async function boot() {
  doc = await (await fetch('data/trophies.json')).json();
  spoiler = localStorage.getItem(SPOILER_KEY) === '1';
  earned = loadProgress();
  if (params.has('demo')) saveProgress();
  applyParams();
  $('spoiler').checked = spoiler;
  $('tabs').addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-view]');
    if (b) switchView(b.dataset.view);
  });
  for (const id of ['search', 'kind', 'grade', 'status']) {
    $(id).addEventListener('input', renderList);
    $(id).addEventListener('change', renderList);
  }
  $('missableOnly').addEventListener('change', renderList);
  $('spoiler').addEventListener('change', () => {
    spoiler = $('spoiler').checked;
    localStorage.setItem(SPOILER_KEY, spoiler ? '1' : '0');
    renderList();
    renderDetail();
    renderRoadmap();
    renderMissables();
  });
  $('export').addEventListener('click', exportProgress);
  $('import').addEventListener('change', (ev) => {
    if (ev.target.files[0]) importProgress(ev.target.files[0]);
    ev.target.value = '';
  });
  $('reset').addEventListener('click', () => {
    if (confirm('Clear all earned trophies in this tracker?')) {
      earned = new Set();
      saveProgress();
      renderList();
      renderDetail();
      renderRoadmap();
      renderMissables();
    }
  });
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
}

boot();
