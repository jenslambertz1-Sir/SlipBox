// ── SLIPBOX APP ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'slipbox_zettel';

// ── STATE ─────────────────────────────────────────────────────────────────────
let zettel = [];          // all notes
let activeId = null;      // currently open note id
let filterType = 'all';   // sidebar filter
let filterTag = null;     // active tag filter
let saveTimer = null;
let recognition = null;
let isRecording = false;

// ── ZETTEL TYPES ──────────────────────────────────────────────────────────────
const TYPES = {
  fleeting:   { label: 'Flüchtig',   color: '#c8a96e', desc: 'Schnelle Gedanken, noch unausgearbeitet' },
  permanent:  { label: 'Permanent',  color: '#7c9e7a', desc: 'Ausgearbeitete, eigenständige Idee' },
  literature: { label: 'Literatur',  color: '#8fa8c8', desc: 'Quellen, Bücher, Artikel' },
  structure:  { label: 'Struktur',   color: '#b88fc8', desc: 'Inhaltsverzeichnis, Überblick' },
};

// ── PERSISTENCE ───────────────────────────────────────────────────────────────
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    zettel = raw ? JSON.parse(raw) : [];
  } catch { zettel = []; }
  if (zettel.length === 0) seedDemo();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(zettel));
  flashSaved();
}

function flashSaved() {
  const el = document.getElementById('save-indicator');
  el.classList.add('show');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => el.classList.remove('show'), 1400);
}

// ── ID GENERATION ─────────────────────────────────────────────────────────────
function genId() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yy}${mm}${dd}${hh}${mi}${ss}`;
}

// ── DEMO DATA ─────────────────────────────────────────────────────────────────
function seedDemo() {
  const base = Date.now();
  zettel = [
    {
      id: '240115103000',
      type: 'structure',
      title: 'Wie die Slipbox funktioniert',
      body: 'Die Slipbox ist kein Archiv – sie ist ein Denkpartner. Ideen verbinden sich von unten nach oben, nicht durch vorher festgelegte Kategorien.\n\nDrei Grundregeln:\n1. Jeder Zettel enthält genau eine Idee.\n2. Zettel sind mit anderen Zetteln verknüpft.\n3. Permanente Zettel werden in eigenen Worten geschrieben.',
      tags: ['meta', 'methode'],
      links: ['240115103100', '240115103200'],
      created: base - 86400000 * 5,
    },
    {
      id: '240115103100',
      type: 'permanent',
      title: 'Atomarität als Grundprinzip',
      body: 'Eine Idee pro Zettel zwingt dazu, wirklich zu verstehen, was man sagen will. Vage Gedanken lassen sich nicht komprimieren – sie müssen erst durchdacht werden.',
      tags: ['methode', 'denken'],
      links: ['240115103000'],
      created: base - 86400000 * 4,
    },
    {
      id: '240115103200',
      type: 'literature',
      title: 'Ahrens – How to Take Smart Notes',
      body: 'Ahrens beschreibt die Slipbox als externales Gedächtnis, das Querverbindungen ermöglicht, die im Kopf verloren gehen würden. Schreiben ist nicht Aufzeichnung von Gedanken, sondern ihr Entstehungsort.',
      tags: ['literatur', 'methode'],
      links: ['240115103100'],
      created: base - 86400000 * 3,
    },
    {
      id: '240115103300',
      type: 'fleeting',
      title: 'Idee: Zettel als Gesprächspartner',
      body: 'Was wäre, wenn man nicht für sich selbst schreibt, sondern für einen zukünftigen Leser – der man selbst ist? Dann ändert sich der Ton: klarer, präziser, respektvoller.',
      tags: ['denken'],
      links: [],
      created: base - 86400000 * 1,
    },
  ];
  save();
}

// ── FILTER & SEARCH ───────────────────────────────────────────────────────────
function getFiltered() {
  const q = document.getElementById('search').value.toLowerCase().trim();
  return zettel.filter(z => {
    if (filterType !== 'all' && z.type !== filterType) return false;
    if (filterTag && !z.tags.includes(filterTag)) return false;
    if (q) {
      const hay = (z.title + ' ' + z.body + ' ' + z.tags.join(' ')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => b.created - a.created);
}

function getAllTags() {
  const set = new Set();
  zettel.forEach(z => z.tags.forEach(t => set.add(t)));
  return [...set].sort();
}

// ── RENDER SIDEBAR ────────────────────────────────────────────────────────────
function renderSidebar() {
  // tag strip
  const strip = document.getElementById('tag-strip');
  const tags = getAllTags();
  strip.innerHTML = tags.map(t =>
    `<span class="tag-pill${filterTag === t ? ' active' : ''}" data-tag="${t}">#${t}</span>`
  ).join('');
  strip.querySelectorAll('.tag-pill').forEach(el => {
    el.addEventListener('click', () => {
      filterTag = filterTag === el.dataset.tag ? null : el.dataset.tag;
      renderSidebar();
    });
  });

  // card list
  const list = document.getElementById('card-list');
  const items = getFiltered();
  if (items.length === 0) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-faint);font-size:12px;">Keine Zettel gefunden.</div>';
    return;
  }
  list.innerHTML = items.map(z => {
    const type = TYPES[z.type] || TYPES.fleeting;
    const date = new Date(z.created).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    const tags = z.tags.map(t => `<span class="card-tag">#${t}</span>`).join('');
    const linksNote = z.links.length ? `<span class="card-tag" style="color:var(--accent3)">↔ ${z.links.length}</span>` : '';
    return `
      <div class="card${activeId === z.id ? ' active' : ''}" data-id="${z.id}">
        <div class="card-header">
          <span class="card-type-dot" style="background:${type.color}"></span>
          <span class="card-id">${z.id}</span>
          <span class="card-date">${date}</span>
        </div>
        <div class="card-title">${z.title || '<em>Ohne Titel</em>'}</div>
        <div class="card-preview">${z.body}</div>
        ${tags || linksNote ? `<div class="card-tags">${tags}${linksNote}</div>` : ''}
      </div>`;
  }).join('');

  list.querySelectorAll('.card').forEach(el => {
    el.addEventListener('click', () => openZettel(el.dataset.id));
  });
}

// ── OPEN / EDITOR ─────────────────────────────────────────────────────────────
function openZettel(id) {
  activeId = id;
  const z = zettel.find(x => x.id === id);
  if (!z) return;
  renderSidebar();
  renderEditor(z);
  // mobile: hide sidebar
  if (window.innerWidth <= 680) {
    document.getElementById('sidebar').classList.add('hidden');
  }
}

function renderEditor(z) {
  const body = document.getElementById('editor-body');
  body.innerHTML = `
    <div>
      <div class="field-label">Zettel-ID</div>
      <div id="field-id-display">${z.id}</div>
    </div>
    <div>
      <div class="field-label">Titel</div>
      <input id="field-title" class="field-input" type="text" value="${escHtml(z.title)}" placeholder="Titel…" />
    </div>
    <div>
      <div class="field-label">Inhalt</div>
      <textarea id="field-body" class="field-textarea" placeholder="Schreibe hier…">${escHtml(z.body)}</textarea>
    </div>
    <div>
      <div class="field-label">Tags (Enter zum Hinzufügen)</div>
      <div id="tags-container">
        ${z.tags.map(t => tagItem(t)).join('')}
        <input id="tag-input" placeholder="#tag" />
      </div>
    </div>
    <div>
      <div class="field-label">Verknüpfungen ↔</div>
      <div id="links-section">
        ${z.links.map(lid => {
          const linked = zettel.find(x => x.id === lid);
          return linked ? `
            <div class="link-row">
              <span class="card-type-dot" style="background:${TYPES[linked.type]?.color || '#888'}"></span>
              <span class="link-row-id">${linked.id}</span>
              <span class="link-row-title">${escHtml(linked.title)}</span>
              <button data-unlink="${lid}" title="Verknüpfung entfernen">×</button>
              <button data-goto="${lid}" title="Öffnen" style="color:var(--accent3)">→</button>
            </div>` : '';
        }).join('')}
        <div id="link-picker-wrap">
          <input id="link-picker-input" placeholder="Zettel verknüpfen…" autocomplete="off" />
          <div id="link-dropdown"></div>
        </div>
      </div>
    </div>
  `;

  // set type buttons
  document.querySelectorAll('.type-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.type === z.type);
  });

  // auto-resize textarea
  const ta = document.getElementById('field-body');
  autoResize(ta);
  ta.addEventListener('input', () => autoResize(ta));

  // live save on input
  ['field-title', 'field-body'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => updateActive());
  });

  // tag input
  const tagInput = document.getElementById('tag-input');
  tagInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.value.replace(/[,#]/g, '').trim();
      if (val) addTag(val);
    } else if (e.key === 'Backspace' && tagInput.value === '') {
      const z = zettel.find(x => x.id === activeId);
      if (z && z.tags.length) { z.tags.pop(); save(); renderEditor(z); }
    }
  });
  document.getElementById('tags-container').addEventListener('click', e => {
    const btn = e.target.closest('[data-removetag]');
    if (btn) removeTag(btn.dataset.removetag);
    else document.getElementById('tag-input').focus();
  });

  // unlink / goto
  document.getElementById('links-section').addEventListener('click', e => {
    if (e.target.dataset.unlink) unlinkZettel(e.target.dataset.unlink);
    if (e.target.dataset.goto) openZettel(e.target.dataset.goto);
  });

  // link picker
  const lpi = document.getElementById('link-picker-input');
  const ldd = document.getElementById('link-dropdown');
  lpi.addEventListener('input', () => {
    const q = lpi.value.toLowerCase();
    const cur = zettel.find(x => x.id === activeId);
    const results = zettel.filter(z =>
      z.id !== activeId &&
      !(cur?.links || []).includes(z.id) &&
      (z.title.toLowerCase().includes(q) || z.id.includes(q) || z.tags.join(' ').includes(q))
    ).slice(0, 8);
    if (results.length && q) {
      ldd.style.display = 'block';
      ldd.innerHTML = results.map(r => `
        <div class="link-option" data-linkid="${r.id}">
          <span class="card-type-dot" style="background:${TYPES[r.type]?.color || '#888'}"></span>
          <span class="link-option-id">${r.id}</span>
          <span class="link-option-title">${escHtml(r.title)}</span>
        </div>`).join('');
      ldd.querySelectorAll('.link-option').forEach(el => {
        el.addEventListener('click', () => { linkZettel(el.dataset.linkid); lpi.value = ''; ldd.style.display = 'none'; });
      });
    } else {
      ldd.style.display = 'none';
    }
  });
  document.addEventListener('click', e => {
    if (!document.getElementById('link-picker-wrap')?.contains(e.target)) {
      ldd.style.display = 'none';
    }
  });
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.max(180, el.scrollHeight) + 'px';
}

function updateActive() {
  const z = zettel.find(x => x.id === activeId);
  if (!z) return;
  z.title = document.getElementById('field-title')?.value || '';
  z.body  = document.getElementById('field-body')?.value || '';
  save();
  renderSidebar();
}

// ── TYPE BUTTONS ──────────────────────────────────────────────────────────────
document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const z = zettel.find(x => x.id === activeId);
    if (!z) return;
    z.type = btn.dataset.type;
    save();
    renderSidebar();
    document.querySelectorAll('.type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === z.type));
  });
});

// ── TAGS ──────────────────────────────────────────────────────────────────────
function tagItem(t) {
  return `<span class="tag-item">#${escHtml(t)}<button data-removetag="${escHtml(t)}" type="button">×</button></span>`;
}

function addTag(val) {
  const z = zettel.find(x => x.id === activeId);
  if (!z || z.tags.includes(val)) return;
  z.tags.push(val);
  save();
  const tc = document.getElementById('tags-container');
  const input = document.getElementById('tag-input');
  const span = document.createElement('span');
  span.className = 'tag-item';
  span.innerHTML = `#${escHtml(val)}<button data-removetag="${escHtml(val)}" type="button">×</button>`;
  tc.insertBefore(span, input);
  input.value = '';
  renderSidebar();
}

function removeTag(val) {
  const z = zettel.find(x => x.id === activeId);
  if (!z) return;
  z.tags = z.tags.filter(t => t !== val);
  save();
  renderEditor(z);
  renderSidebar();
}

// ── LINKS ─────────────────────────────────────────────────────────────────────
function linkZettel(targetId) {
  const z = zettel.find(x => x.id === activeId);
  const t = zettel.find(x => x.id === targetId);
  if (!z || !t) return;
  if (!z.links.includes(targetId)) z.links.push(targetId);
  if (!t.links.includes(activeId)) t.links.push(activeId); // bidirectional
  save();
  renderEditor(z);
  renderSidebar();
}

function unlinkZettel(targetId) {
  const z = zettel.find(x => x.id === activeId);
  const t = zettel.find(x => x.id === targetId);
  if (z) z.links = z.links.filter(l => l !== targetId);
  if (t) t.links = t.links.filter(l => l !== activeId);
  save();
  renderEditor(zettel.find(x => x.id === activeId));
  renderSidebar();
}

// ── NEW ZETTEL ────────────────────────────────────────────────────────────────
document.getElementById('btn-new').addEventListener('click', () => {
  const id = genId();
  const z = { id, type: 'fleeting', title: '', body: '', tags: [], links: [], created: Date.now() };
  zettel.unshift(z);
  save();
  renderSidebar();
  openZettel(id);
  setTimeout(() => document.getElementById('field-title')?.focus(), 60);
});

// ── DELETE ────────────────────────────────────────────────────────────────────
document.getElementById('btn-delete').addEventListener('click', () => {
  if (!activeId) return;
  const z = zettel.find(x => x.id === activeId);
  if (!z) return;
  if (!confirm(`Zettel „${z.title || z.id}" wirklich löschen?`)) return;
  // remove from all links
  zettel.forEach(other => { other.links = other.links.filter(l => l !== activeId); });
  zettel = zettel.filter(x => x.id !== activeId);
  activeId = null;
  save();
  renderSidebar();
  document.getElementById('editor-body').innerHTML = `
    <div id="empty-state">
      <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>
      </svg>
      <p>Zettel gelöscht.<br>Erstelle einen neuen.</p>
    </div>`;
});

// ── FILTER TABS ───────────────────────────────────────────────────────────────
document.querySelectorAll('.ftab').forEach(tab => {
  tab.addEventListener('click', () => {
    filterType = tab.dataset.type;
    document.querySelectorAll('.ftab').forEach(t => t.classList.toggle('active', t === tab));
    renderSidebar();
  });
});

// ── SEARCH ────────────────────────────────────────────────────────────────────
document.getElementById('search').addEventListener('input', renderSidebar);

// ── MOBILE BACK ───────────────────────────────────────────────────────────────
document.getElementById('btn-back').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('hidden');
});

// ── VOICE DICTATION ───────────────────────────────────────────────────────────
const btnVoice = document.getElementById('btn-voice');

function setupVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { btnVoice.title = 'Diktat nicht verfügbar'; btnVoice.style.opacity = '.35'; return; }
  recognition = new SR();
  recognition.lang = 'de-DE';
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.onresult = e => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join(' ');
    const ta = document.getElementById('field-body');
    if (ta) {
      ta.value += (ta.value ? ' ' : '') + transcript;
      autoResize(ta);
      updateActive();
    }
  };
  recognition.onend = () => { isRecording = false; btnVoice.classList.remove('recording'); };
}

btnVoice.addEventListener('click', () => {
  if (!recognition) return;
  if (isRecording) {
    recognition.stop();
  } else {
    if (!activeId) { alert('Bitte öffne zuerst einen Zettel.'); return; }
    recognition.start();
    isRecording = true;
    btnVoice.classList.add('recording');
  }
});

// ── UTILS ─────────────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── SERVICE WORKER ────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ── BOOT ──────────────────────────────────────────────────────────────────────
load();
setupVoice();
renderSidebar();
