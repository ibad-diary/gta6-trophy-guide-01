// Leonida Platinum — GTA VI trophy guide & tracker.
// Fully offline: loads data/trophies.json once at boot, saves progress in
// localStorage, renders the tracker, roadmap and missables views.
function $(id) { return document.getElementById(id); }

const listEl = $('list');
const detailEl = $('detail');
const params = new URLSearchParams(location.search);

let doc = null;
let earned = new Set();
let counters = {};
let spoiler = false;
let selectedId = null;

const PROGRESS_KEY = 'leonida-platinum-progress-v1';
const SPOILER_KEY = 'leonida-platinum-spoiler-v1';
const COUNTERS_KEY = 'leonida-platinum-counters-v1';

const POINTS = { platinum: 300, gold: 90, silver: 30, bronze: 15 };

const DEMO_EARNED = [2, 3, 8, 10, 16, 19, 20, 21, 35, 36, 42, 52, 53];

// Cumulative progress trophies only. Excluded on purpose: #14 (100%
// completion is a percentage, not a running count) and #36 (a single use
// of Combat Focus, not a running total). Both still show their Target tag
// and target line, but get no counter tag and no stepper.
const CUMULATIVE = new Set([15, 16, 17, 18, 19, 25, 28, 30, 31, 32, 35, 40, 42, 43, 48, 52, 53, 54, 55]);

const DEMO_COUNTERS = { 15: 187, 16: 7, 17: 31, 18: 9, 19: 13, 25: 6, 28: 11, 30: 2, 31: 57, 32: 34, 35: 61, 40: 3, 42: 41, 43: 6, 48: 214, 52: 184000, 53: 73000, 54: 5, 55: 7 };

const STAGES = [
  { n: 1, title: 'Stage 1 — Play the story', blurb: 'Chapters 1–4, the named story missions and the finale. The 15 story trophies come naturally; do the partner and secret moments listed in the pre-finale checklist before the final mission.' },
  { n: 2, title: 'Stage 2 — Strangers & side missions', blurb: 'The five named stranger finales plus three more strands for the silver, the unique-animal hunt, the partner trophies and the choice counter. Do strands as their icons appear.' },
  { n: 3, title: 'Stage 3 — Activities & skills', blurb: 'Shooting Range golds, drone races, races, fishing, arcade, bowling, combat feats and the activity sampler. Skill-based: save the 42 gold medals for when your shooting is at its best.' },
  { n: 4, title: 'Stage 4 — Collectibles & exploration', blurb: 'Cards, meditation spots, WAiNK locations, vehicles, areas, gangs, vaults, garages and the economy totals. Combine trips: one new area earns exploration, WAiNK, vehicle and meditation progress at once.' },
  { n: 5, title: 'Stage 5 — Clean-up & platinum', blurb: '100% completion, the last stunts, the last challenges and the platinum itself. Check the tracker against the in-game stats screen before declaring yourself done.' },
];

const PREFINALE = [33, 34, 37, 44, 45, 46, 47, 22, 23, 24, 26, 27, 29];

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return new Set((Array.isArray(parsed) ? parsed : []).filter(n => typeof n === 'string'));
    }
  } catch (e) {
    // corrupted save: start fresh
  }
  if (params.has('demo')) {
    return new Set(DEMO_EARNED.map(id => trophyById(id).name));
  }
  return new Set();
}

function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify([...earned]));
}

function loadCounters() {
  try {
    const raw = localStorage.getItem(COUNTERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return cleanCounters(parsed);
    }
  } catch (e) {
    // corrupted save: start fresh
  }
  if (params.has('demo')) {
    return { ...DEMO_COUNTERS };
  }
  return {};
}

function saveCounters() {
  localStorage.setItem(COUNTERS_KEY, JSON.stringify(counters));
}

function cleanCounters(obj) {
  const out = {};
  for (const [key, v] of Object.entries(obj)) {
    const id = Number(key);
    const t = doc ? doc.trophies.find(x => x.id === id) : null;
    if (!t || !CUMULATIVE.has(id) || !Number.isFinite(v)) continue;
    out[id] = Math.max(0, Math.min(t.target, Math.floor(v)));
  }
  return out;
}

function counterStep(t) {
  if (t.target >= 10000) return 1000;
  if (t.target >= 100) return 10;
  return 1;
}

function counterLabel(t) {
  const n = (counters[t.id] || 0).toLocaleString('en-US');
  const target = t.target.toLocaleString('en-US');
  if (t.id === 52 || t.id === 53) return 'Progress: $' + n + ' / $' + target;
  return 'Progress: ' + n + ' / ' + target;
}

function setCounter(id, value) {
  const t = trophyById(id);
  if (!t || !CUMULATIVE.has(id)) return;
  counters[id] = Math.max(0, Math.min(t.target, value));
  saveCounters();
}

function trophyById(id) {
  return doc.trophies.find(t => t.id === id);
}

function sourceUrl(name) {
  const found = (doc.sources || []).find(s => s.name === name);
  return found ? found.url : null;
}

function isSpoilerHidden(t) {
  return spoiler && t.hidden && !earned.has(t.name);
}

function gradeLabel(t) {
  return t.grade.charAt(0).toUpperCase() + t.grade.slice(1);
}

function kindLabel(kind) {
  const map = {
    story: 'Story',
    mission: 'Story mission',
    stranger: 'Stranger strand',
    collectible: 'Collectible',
    activity: 'Activity',
    stunt: 'Stunts & races',
    combat: 'Combat',
    robbery: 'Robbery',
    economy: 'Economy',
    exploration: 'Exploration',
    secret: 'Secret',
  };
  return map[kind] || kind;
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
  let pts = 0;
  for (const t of doc.trophies) {
    if (earned.has(t.name)) pts += POINTS[t.grade];
  }
  $('earnedCount').textContent = earned.size;
  $('progressFill').style.width = Math.round((earned.size / total) * 100) + '%';
  $('pointsEarned').textContent = pts.toLocaleString('en-US');
  $('gradeCounts').textContent = ['platinum', 'gold', 'silver', 'bronze'].map(g => {
    const all = doc.trophies.filter(t => t.grade === g).length;
    const got = doc.trophies.filter(t => t.grade === g && earned.has(t.name)).length;
    return gradeLabel({ grade: g }) + ' ' + got + '/' + all;
  }).join(' · ');
  const remaining = doc.trophies
    .filter(t => !earned.has(t.name))
    .sort((a, b) => (a.stage - b.stage) || (a.id - b.id))
    .slice(0, 3);
  $('nextUp').textContent = remaining.length
    ? 'Next up: ' + remaining.map(t => t.name).join(' · ')
    : 'Platinum earned — Leonida Legend!';
  $('missableCount').textContent = '(' + doc.trophies.filter(t => t.missable).length + ' flagged)';
}

function renderList() {
  const shown = doc.trophies.filter(matchesFilters);
  if ($('kind').value === 'online') {
    listEl.innerHTML = '<p class="empty">No online trophies in this list — all 55 trophies are earned in single-player. Nothing here needs PS Plus or another player.</p>';
  } else if (!shown.length) {
    listEl.innerHTML = '<p class="empty">No trophies match these filters.</p>';
  } else {
    listEl.replaceChildren();
    for (const t of shown) listEl.appendChild(makeTrophyCard(t));
  }
  $('listHint').textContent = shown.length + ' of ' + doc.trophies.length + ' trophies shown · ' + earned.size + ' earned · click a trophy to read its guide';
  renderProgress();
}

function makeTrophyCard(t) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'card g-' + t.grade + (earned.has(t.name) ? ' earned' : '') + (selectedId === t.id ? ' selected' : '');
  const row = document.createElement('span');
  row.className = 'trow';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(t.name);
  box.setAttribute('aria-label', 'Mark ' + t.name + ' earned');
  box.addEventListener('click', ev => {
    ev.stopPropagation();
    if (box.checked) {
      earned.add(t.name);
      if (CUMULATIVE.has(t.id)) setCounter(t.id, t.target);
    } else {
      earned.delete(t.name);
    }
    saveProgress();
    renderList();
    renderDetail();
    renderRoadmap();
    renderMissables();
  });
  const body = document.createElement('span');
  const name = document.createElement('span');
  name.className = 'tname';
  name.textContent = isSpoilerHidden(t) ? 'Hidden trophy — earn it to reveal' : t.name;
  const desc = document.createElement('span');
  desc.className = 'tdesc';
  desc.textContent = isSpoilerHidden(t) ? 'Hidden on PlayStation until earned.' : t.description;
  const tags = document.createElement('span');
  tags.className = 'tags';
  const gradeTag = document.createElement('span');
  gradeTag.className = 'tag grade-' + t.grade;
  gradeTag.textContent = gradeLabel(t) + ' · ' + POINTS[t.grade] + ' pts';
  tags.appendChild(gradeTag);
  const kindTag = document.createElement('span');
  kindTag.className = 'tag';
  kindTag.textContent = kindLabel(t.kind);
  tags.appendChild(kindTag);
  if (t.missable) {
    const miss = document.createElement('span');
    miss.className = 'tag miss';
    miss.textContent = 'Missable';
    tags.appendChild(miss);
  }
  if (t.hidden) {
    const hid = document.createElement('span');
    hid.className = 'tag hiddenTag';
    hid.textContent = 'Hidden';
    tags.appendChild(hid);
  }
  if (t.target) {
    const tgt = document.createElement('span');
    tgt.className = 'tag';
    tgt.textContent = targetLabel(t);
    tags.appendChild(tgt);
  }
  if (CUMULATIVE.has(t.id)) {
    const ctr = document.createElement('span');
    ctr.className = 'tag counter';
    ctr.textContent = counterLabel(t);
    tags.appendChild(ctr);
  }
  body.appendChild(name);
  body.appendChild(document.createElement('br'));
  body.appendChild(desc);
  body.appendChild(tags);
  row.appendChild(box);
  row.appendChild(body);
  card.appendChild(row);
  card.addEventListener('click', () => {
    selectedId = t.id;
    renderList();
    renderDetail();
  });
  return card;
}

function renderDetail() {
  const t = selectedId == null ? null : trophyById(selectedId);
  if (!t) {
    detailEl.innerHTML = '<p class="detailEmpty">Select a trophy to read its guide, sources and missable note.</p>';
    return;
  }
  detailEl.replaceChildren();
  const h2 = document.createElement('h2');
  h2.textContent = isSpoilerHidden(t) ? 'Hidden trophy' : t.name;
  detailEl.appendChild(h2);
  const meta = document.createElement('p');
  meta.textContent = gradeLabel(t) + ' · ' + POINTS[t.grade] + ' points · ' + kindLabel(t.kind) + (t.hidden ? ' · Hidden on PSN' : '');
  detailEl.appendChild(meta);
  if (t.target) {
    const target = document.createElement('p');
    target.className = 'target';
    target.textContent = targetLabel(t);
    detailEl.appendChild(target);
  }
  const cited = document.createElement('p');
  cited.className = 'cited';
  cited.appendChild(document.createTextNode('Cited sources: '));
  for (const name of t.sources) {
    const a = document.createElement('a');
    a.textContent = name;
    const url = sourceUrl(name);
    if (url) {
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
    }
    cited.appendChild(a);
    cited.appendChild(document.createTextNode(' · '));
  }
  if (cited.lastChild) cited.removeChild(cited.lastChild);
  detailEl.appendChild(cited);
  if (CUMULATIVE.has(t.id)) {
    const row = document.createElement('p');
    row.className = 'counterRow';
    const label = document.createElement('span');
    label.textContent = 'Your progress: ';
    row.appendChild(label);
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−' + counterStep(t);
    minus.addEventListener('click', () => {
      setCounter(t.id, (counters[t.id] || 0) - counterStep(t));
      renderList();
      renderDetail();
    });
    row.appendChild(minus);
    row.appendChild(document.createTextNode(' '));
    const value = document.createElement('strong');
    value.textContent = counterLabel(t).replace('Progress: ', '');
    row.appendChild(value);
    row.appendChild(document.createTextNode(' '));
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+' + counterStep(t);
    plus.addEventListener('click', () => {
      setCounter(t.id, (counters[t.id] || 0) + counterStep(t));
      renderList();
      renderDetail();
    });
    row.appendChild(plus);
    detailEl.appendChild(row);
  }
  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = isSpoilerHidden(t)
    ? 'Official description hidden until earned.'
    : 'Official description: "' + t.description + '"';
  detailEl.appendChild(official);
  if (t.missable) {
    const warn = document.createElement('p');
    warn.className = 'warn';
    warn.textContent = 'Missable — ' + t.missableReason;
    detailEl.appendChild(warn);
  } else {
    const ok = document.createElement('p');
    ok.textContent = 'Not missable — this can be finished in free roam after the story.';
    detailEl.appendChild(ok);
  }
  const guideH = document.createElement('h3');
  guideH.textContent = 'Guide';
  detailEl.appendChild(guideH);
  const guide = document.createElement('p');
  guide.className = 'guide';
  guide.textContent = isSpoilerHidden(t)
    ? 'Turn off the spoiler-free setting or earn this trophy to read its guide.'
    : t.guide;
  detailEl.appendChild(guide);
  const sourcesH = document.createElement('h3');
  sourcesH.textContent = 'Sources';
  detailEl.appendChild(sourcesH);
  const ul = document.createElement('ul');
  ul.className = 'src';
  for (const name of t.sources) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.textContent = name;
    const url = sourceUrl(name);
    if (url) {
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
    }
    li.appendChild(a);
    ul.appendChild(li);
  }
  detailEl.appendChild(ul);
  const note = document.createElement('p');
  note.className = 'src';
  note.textContent = 'Guide text is our own words, written for this guide. The name and description above are the official ones as PlayStation publishes them.';
  detailEl.appendChild(note);
}

function renderRoadmap() {
  const box = $('roadmap');
  box.replaceChildren();
  for (const stage of STAGES) {
    const trophies = doc.trophies.filter(t => t.stage === stage.n);
    const done = trophies.filter(t => earned.has(t.name)).length;
    const div = document.createElement('div');
    div.className = 'stage';
    const h3 = document.createElement('h3');
    h3.textContent = stage.title + ' — ' + done + '/' + trophies.length + ' earned';
    div.appendChild(h3);
    const blurb = document.createElement('p');
    blurb.className = 'lede';
    blurb.textContent = stage.blurb;
    div.appendChild(blurb);
    const ol = document.createElement('ol');
    for (const t of trophies) {
      const li = document.createElement('li');
      if (earned.has(t.name)) li.className = 'done';
      li.textContent = (isSpoilerHidden(t) ? 'Hidden trophy' : t.name) + ' — ' + gradeLabel(t)
        + (t.missable ? ' · missable' : '')
        + (t.target ? ' · ' + targetLabel(t) : '');
      ol.appendChild(li);
    }
    div.appendChild(ol);
    box.appendChild(div);
  }
  const pre = $('prefinale');
  pre.replaceChildren();
  for (const id of PREFINALE) {
    const t = trophyById(id);
    const li = document.createElement('li');
    if (earned.has(t.name)) li.className = 'done';
    li.textContent = (isSpoilerHidden(t) ? 'Hidden trophy' : t.name) + ': ' + t.missableReason;
    pre.appendChild(li);
  }
}

function renderMissables() {
  const list = doc.trophies.filter(t => t.missable);
  $('missableTotal').textContent = list.length + ' of 55';
  const box = $('missableList');
  box.replaceChildren();
  for (const t of list) {
    const card = document.createElement('div');
    card.className = 'missCard';
    const name = document.createElement('div');
    name.className = 'tname';
    name.textContent = (isSpoilerHidden(t) ? 'Hidden trophy' : t.name) + ' — ' + gradeLabel(t) + ' · ' + kindLabel(t.kind);
    card.appendChild(name);
    const desc = document.createElement('div');
    desc.className = 'tdesc';
    desc.textContent = isSpoilerHidden(t) ? 'Hidden on PlayStation until earned.' : t.description;
    card.appendChild(desc);
    const reason = document.createElement('p');
    reason.textContent = t.missableReason;
    card.appendChild(reason);
    const status = document.createElement('p');
    status.textContent = earned.has(t.name) ? 'Earned ✓' : 'Not earned yet — do it before it passes.';
    card.appendChild(status);
    box.appendChild(card);
  }
}

function exportProgress() {
  const data = {
    game: 'Grand Theft Auto VI',
    guide: 'Leonida Platinum',
    exportedAt: new Date().toISOString(),
    earned: [...earned],
    counters,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importProgress(file) {
  file.text().then(text => {
    const data = JSON.parse(text);
    const names = Array.isArray(data) ? data : data.earned;
    const known = new Set(doc.trophies.map(t => t.name));
    const good = (Array.isArray(names) ? names : []).filter(n => known.has(n));
    if (!good.length) throw new Error('no known trophy names');
    earned = new Set(good);
    if (data && typeof data === 'object' && data.counters) {
      counters = cleanCounters(data.counters);
      saveCounters();
    }
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
    $('view-' + v).hidden = (v !== view);
  }
}

function applyParams() {
  const view = params.get('view');
  if (view && ['tracker', 'roadmap', 'missables', 'about'].includes(view)) switchView(view);
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
  counters = loadCounters();
  if (params.has('demo')) {
    saveProgress();
    saveCounters();
  }
  applyParams();
  $('spoiler').checked = spoiler;
  $('tabs').addEventListener('click', ev => {
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
  $('import').addEventListener('change', ev => {
    const file = ev.target.files && ev.target.files[0];
    if (file) importProgress(file);
    ev.target.value = '';
  });
  $('reset').addEventListener('click', () => {
    if (!confirm('Clear all earned trophies and progress counters in this tracker?')) return;
    earned = new Set();
    counters = {};
    saveProgress();
    saveCounters();
    renderList();
    renderDetail();
    renderRoadmap();
    renderMissables();
  });
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
}

boot();
