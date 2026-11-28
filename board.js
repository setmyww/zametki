'use strict';
/* Доски: бесконечный холст в духе Miro и Obsidian Canvas.
   Использует общие функции и состояние из app.js. */

// ---------- Значки инструментов (контурные) ----------
const BI = {
  select: '<path d="M5 3l14 7-6 2-2 6z"/>',
  hand: '<path d="M8 12V6a1.5 1.5 0 013 0v5m0-6.5a1.5 1.5 0 013 0V11m0-5a1.5 1.5 0 013 0v8c0 4-2.5 7-6.5 7-3 0-4.5-1.500-6-4l-2-3.5a1.5 1.5 0 012.5-1.5L8 14"/>',
  sticky: '<path d="M4 4h16v10l-6 6H4z"/><path d="M14 20v-6h6"/>',
  text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
  rect: '<rect x="3.5" y="5" width="17" height="14" rx="2"/>',
  ellipse: '<ellipse cx="12" cy="12" rx="9" ry="8"/>',
  diamond: '<path d="M12 3l9 9-9 9-9-9z"/>',
  arrow: '<path d="M5 19L19 5M9 5h10v10"/>',
  pen: '<path d="M4 20l1-4L16.500 4.500a2.100 2.100 0 013 3L8 19zM14 7l3 3"/>',
  eraser: '<path d="M8 20l-5-5L14 4l7 7-9 9H8zm0 0h13M8.500 9.500l6 6"/>',
  frame: '<path d="M7 2v20M17 2v20M2 7h20M2 17h20"/>',
  note: '<path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 17l5-5 4 4 3-3 6 6"/><circle cx="15.500" cy="9" r="1.500"/>',
  file: '<path d="M6 3h8l5 5v13H6zM14 3v5h5"/>',
  undo: '<path d="M9 7L4 12l5 5M4 12h10a6 6 0 016 6"/>',
  redo: '<path d="M15 7l5 5-5 5M20 12H10a6 6 0 00-6 6"/>',
  fit: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  download: '<path d="M12 4v11m-5-4l5 5 5-5M5 20h14"/>',
  board: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h4v5H7zM14 8h3v8h-3z"/>',
  front: '<rect x="9" y="9" width="11" height="11" fill="currentColor"/><path d="M4 15V4h11"/>',
  back: '<path d="M9 9h11v11H9z"/><rect x="4" y="4" width="11" height="11" fill="currentColor"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  color: '<circle cx="12" cy="12" r="8" fill="currentColor"/>',
  bigger: '<path d="M3 18L8 6l5 12M5 14h6M17 8v8M13.500 12h7"/>',
  smaller: '<path d="M3 18L8 6l5 12M5 14h6M14 12h7"/>',
  dash: '<path d="M3 12h3M10 12h4M18 12h3"/>',
  label: '<path d="M4 7V5h16v2M12 5v14M9 19h6"/>',
  swap: '<path d="M7 7h13l-4-4M17 17H4l4 4"/>',
};
const bicon = (n, s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${BI[n]}</svg>`;

const BOARD_TOOLS = [
  ['select', 'Выделение', 'V'], ['hand', 'Рука (пробел)', 'H'], null,
  ['sticky', 'Стикер', 'N'], ['text', 'Текст', 'T'], ['rect', 'Прямоугольник', 'R'], ['ellipse', 'Эллипс', 'O'], ['diamond', 'Ромб', 'D'],
  ['arrow', 'Стрелка', 'A'], ['pen', 'Карандаш', 'P'], ['eraser', 'Ластик (для карандаша)', 'E'], ['frame', 'Рамка', 'F'],
];
const BOARD_INSERT = [['note', 'Добавить заметку'], ['image', 'Добавить картинку'], ['file', 'Добавить файл']];
const PEN_COLORS = ['auto', '#ff5c5c', '#f5b400', '#3ecf8e', '#4da3ff', '#b57bff'];
const PEN_WIDTHS = [2, 4, 8];
const SIZES = { sticky: [200, 160], text: [220, 44], rect: [180, 110], ellipse: [170, 120], diamond: [170, 130], frame: [520, 360], note: [260, 200], file: [250, 70] };
const FONT_SIZES = [12, 15, 20, 28, 40, 56];
const MINZ = 0.1, MAXZ = 4;

let B = null; // состояние открытой доски
let boardClip = null;

const getBoard = (id) => state.boards.find((b) => b.id === id);
const boardsIn = (folderId) => state.boards.filter((b) => (b.folderId || null) === (folderId || null)).sort((a, b) => b.updatedAt - a.updatedAt);
const boardFiles = () => state.boards.flatMap((b) => b.elements.filter((e) => e.file).map((e) => e.file));
const boardsWord = (k) => `${k} ${plural(k, 'элемент', 'элемента', 'элементов')}`;
function normalizeBoard(b) {
  return {
    id: uid(), name: 'Доска', folderId: null, createdAt: Date.now(), updatedAt: Date.now(), ...b,
    elements: Array.isArray(b.elements) ? b.elements : [], edges: Array.isArray(b.edges) ? b.edges : [],
    assets: b.assets || {}, view: b.view || null,
  };
}

// ---------- Шаблоны ----------
const mk = (type, x, y, extra = {}) => ({ id: uid(), type, x, y, w: SIZES[type][0], h: SIZES[type][1], text: '', color: type === 'sticky' ? 'sand' : 'default', ...extra });
const TEMPLATES = {
  empty: ['Пустая доска', () => ({ elements: [], edges: [] })],
  kanban: ['Канбан', () => {
    const els = [];
    [['Сделать', 'coral'], ['В работе', 'sand'], ['Готово', 'mint']].forEach(([t, c], i) => {
      els.push(mk('frame', i * 280, 0, { w: 250, h: 480, text: t }));
      els.push(mk('sticky', i * 280 + 25, 50, { w: 200, h: 100, color: c, text: ['Новая задача', 'Делаю сейчас', 'Выполнено'][i] }));
    });
    return { elements: els, edges: [] };
  }],
  mind: ['Карта идей', () => {
    const c = mk('ellipse', 0, 0, { w: 220, h: 120, text: 'Главная идея', color: 'dusk' });
    const kids = [[-340, -160], [350, -160], [-340, 180], [350, 180]].map(([x, y], i) => mk('sticky', x, y, { w: 180, h: 90, text: `Ветка ${i + 1}`, color: ['sky', 'mint', 'sand', 'rose'][i] }));
    return { elements: [c, ...kids], edges: kids.map((k) => ({ id: uid(), a: { id: c.id }, b: { id: k.id }, color: 'auto', head: false, dash: false, label: '' })) };
  }],
  week: ['План недели', () => {
    const els = [];
    ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'].forEach((d, i) => {
      els.push(mk('frame', (i % 4) * 260, Math.floor(i / 4) * 340, { w: 240, h: 320, text: d }));
    });
    return { elements: els, edges: [] };
  }],
};

// ---------- Список досок и операции с ними ----------
function createBoard(tpl = 'empty', folderId = null) {
  const [title, make] = TEMPLATES[tpl];
  const base = tpl === 'empty' ? 'Новая доска' : title;
  const names = new Set(state.boards.map((b) => b.name));
  let name = base, i = 2;
  while (names.has(name)) name = `${base} ${i++}`;
  const b = normalizeBoard({ name, folderId, ...make() });
  state.boards.push(b);
  save();
  setSection('board:' + b.id);
}
function newBoardMenu(anchor, folderId = null) {
  menuPopover(anchor, Object.entries(TEMPLATES).map(([k, [t]]) => [t, () => createBoard(k, folderId)]));
}
function promptDialog(title, value, okText = 'Сохранить') {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'dialog';
    el.innerHTML = `<div class="dlg-title">${esc(title)}</div><input class="inp" maxlength="80"><div class="dlg-actions"><button class="text-btn" data-r="0">Отмена</button><button class="text-btn primary" data-r="1">${esc(okText)}</button></div>`;
    const inp = $('input', el);
    inp.value = value;
    let result = null;
    const close = openDialog(el, { onClose: () => resolve(result) });
    const ok = () => { result = inp.value.trim(); close(); };
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (!b) return; if (b.dataset.r === '1') ok(); else close(); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ok(); } });
    inp.focus(); inp.select();
  });
}
async function renameBoard(id) {
  const b = getBoard(id);
  if (!b) return;
  const name = await promptDialog('Название доски', b.name);
  if (!name) return;
  b.name = name; save(); renderHeader(); if (ui.section !== 'board') renderNotes();
}
function deleteBoard(id) {
  const b = getBoard(id);
  if (!b) return;
  const idx = state.boards.indexOf(b);
  state.boards.splice(idx, 1);
  if (ui.section === 'board' && ui.boardId === id) setSection('boards');
  save(); render();
  showSnack(`Доска «${b.name}» удалена`, makeUndo(() => { state.boards.splice(idx, 0, b); }));
}
function duplicateBoard(id) {
  const b = getBoard(id);
  if (!b) return;
  const copy = normalizeBoard(JSON.parse(JSON.stringify(b)));
  Object.assign(copy, { id: uid(), name: `${b.name} (копия)`, createdAt: Date.now(), updatedAt: Date.now() });
  state.boards.push(copy);
  save(); render();
}
function boardMenu(anchor, id) {
  const b = getBoard(id);
  if (!b) return;
  const items = [];
  if (ui.section !== 'board') items.push(['Открыть', () => setSection('board:' + id)]);
  items.push(
    ['Переименовать', () => renameBoard(id)],
    ['Переместить в папку', () => folderPopover(anchor, b.folderId, (fid) => { b.folderId = fid; save(); render(); })],
    ['Создать копию', () => duplicateBoard(id)],
    ['Сохранить как картинку', () => exportBoardPNG(b)],
    ['Удалить доску', () => deleteBoard(id)],
  );
  menuPopover(anchor, items);
}
function boardPreviewSVG(b) {
  if (!b.elements.length) return `<span class="bprev-empty">${bicon('board', 36)}</span>`;
  const box = boundsOf(b.elements);
  const pad = Math.max(box.w, box.h) * 0.06 + 10;
  return `<svg viewBox="${box.x - pad} ${box.y - pad} ${box.w + pad * 2} ${box.h + pad * 2}" preserveAspectRatio="xMidYMid meet">${b.elements.slice(0, 80).map((e) => {
    if (e.type === 'pen') return `<path class="pv-pen" d="${penPath(e)}" transform="translate(${e.x} ${e.y}) scale(${e.w / e.w0} ${e.h / e.h0})"/>`;
    const c = e.type === 'note' ? getNote(e.noteId)?.color : e.color;
    const cls = e.type === 'frame' ? 'pv-frame' : 'pv-el';
    if (e.type === 'ellipse') return `<ellipse ${colorAttr(c)} class="${cls}" cx="${e.x + e.w / 2}" cy="${e.y + e.h / 2}" rx="${e.w / 2}" ry="${e.h / 2}"/>`;
    return `<rect ${colorAttr(c)} class="${cls}" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="8"/>`;
  }).join('')}</svg>`;
}
function boardCardHTML(b) {
  const f = b.folderId && getFolder(b.folderId);
  return `<div class="bcard" data-board="${b.id}">
    <button class="icon-btn tiny fmore" data-act="bmenu" title="Действия с доской">${icon('more', 16)}</button>
    <div class="bprev">${boardPreviewSVG(b)}</div>
    <div class="fname">${esc(b.name)}</div>
    <div class="fsub">${boardsWord(b.elements.length)}${f ? ` · ${esc(f.name)}` : ''} · ${esc(fmtDay(new Date(b.updatedAt)))}</div>
  </div>`;
}
function boardsSectionHTML(list, title, folderId = null, withNew = true) {
  return `<div class="section"><h2 class="sec-h">${title}${list.length ? `<span class="sec-count">${list.length}</span>` : ''}</h2><div class="bgrid">${list.map(boardCardHTML).join('')}`
    + (withNew ? `<button class="bcard bnew" data-global="new-board" data-folder="${folderId || ''}">${bicon('plus', 30)}<div class="fname">Новая доска</div></button>` : '') + '</div></div>';
}
const searchBoards = (q) => state.boards.filter((b) => b.name.toLowerCase().includes(q) || b.elements.some((e) => (e.text || '').toLowerCase().includes(q)));

// ---------- Геометрия ----------
const elById = (id) => B.board.elements.find((e) => e.id === id);
function boundsOf(els) {
  const x = Math.min(...els.map((e) => e.x)), y = Math.min(...els.map((e) => e.y));
  const r = Math.max(...els.map((e) => e.x + e.w)), btm = Math.max(...els.map((e) => e.y + e.h));
  return { x, y, w: r - x, h: btm - y };
}
const inside = (outer, e) => e.x >= outer.x && e.y >= outer.y && e.x + e.w <= outer.x + outer.w && e.y + e.h <= outer.y + outer.h;
const intersects = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function toWorld(cx, cy) {
  const r = B.vp.getBoundingClientRect(), v = B.board.view;
  return { x: (cx - r.left - v.x) / v.z, y: (cy - r.top - v.y) / v.z };
}
const viewCenter = () => { const r = B.vp.getBoundingClientRect(); return toWorld(r.left + r.width / 2, r.top + r.height / 2); };
const SIDES = { t: [0.5, 0, 0, -1], r: [1, 0.5, 1, 0], b: [0.5, 1, 0, 1], l: [0, 0.5, -1, 0] };
const sidePoint = (e, s) => ({ x: e.x + e.w * SIDES[s][0], y: e.y + e.h * SIDES[s][1], nx: SIDES[s][2], ny: SIDES[s][3] });
function endAnchor(end, other) {
  const el = end.id && elById(end.id);
  if (!el) return { x: end.x || 0, y: end.y || 0, free: true };
  if (end.side) return sidePoint(el, end.side);
  const o = other.id && elById(other.id);
  const t = o ? { x: o.x + o.w / 2, y: o.y + o.h / 2 } : { x: other.x, y: other.y };
  const dx = (t.x - el.x - el.w / 2) / (el.w || 1), dy = (t.y - el.y - el.h / 2) / (el.h || 1);
  return sidePoint(el, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'b' : 't'));
}
function edgeGeom(edge) {
  const p = endAnchor(edge.a, edge.b), q = endAnchor(edge.b, edge.a);
  const k = Math.min(160, Math.max(30, Math.hypot(q.x - p.x, q.y - p.y) * 0.4));
  const c1 = p.free ? { x: p.x + (q.x - p.x) / 3, y: p.y + (q.y - p.y) / 3 } : { x: p.x + p.nx * k, y: p.y + p.ny * k };
  const c2 = q.free ? { x: q.x + (p.x - q.x) / 3, y: q.y + (p.y - q.y) / 3 } : { x: q.x + q.nx * k, y: q.y + q.ny * k };
  const d = `M${p.x} ${p.y}C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${q.x} ${q.y}`;
  const ang = Math.atan2(q.y - c2.y, q.x - c2.x);
  const head = [[q.x, q.y], [q.x - 13 * Math.cos(ang - 0.45), q.y - 13 * Math.sin(ang - 0.45)], [q.x - 13 * Math.cos(ang + 0.45), q.y - 13 * Math.sin(ang + 0.45)]];
  const mid = { x: (p.x + 3 * c1.x + 3 * c2.x + q.x) / 8, y: (p.y + 3 * c1.y + 3 * c2.y + q.y) / 8 };
  return { d, head, mid };
}
function penPath(e) {
  const p = e.points;
  if (p.length < 2) return `M${p[0][0]} ${p[0][1]}l.1 .1`;
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 1; i < p.length - 1; i++) d += `Q${p[i][0]} ${p[i][1]} ${(p[i][0] + p[i + 1][0]) / 2} ${(p[i][1] + p[i + 1][1]) / 2}`;
  const l = p[p.length - 1];
  return `${d}L${l[0]} ${l[1]}`;
}
const strokeColor = (c) => (!c || c === 'auto' ? 'var(--text)' : c);

// ---------- История изменений ----------
const snap = () => JSON.stringify({ elements: B.board.elements, edges: B.board.edges });
function pushHistory(s = snap()) {
  if (B.undo[B.undo.length - 1] === s) return;
  B.undo.push(s);
  if (B.undo.length > 80) B.undo.shift();
  B.redo = [];
}
function commit() { B.board.updatedAt = Date.now(); save(); paintBoard(); }
function change(fn) { pushHistory(); fn(); commit(); }
function stepHistory(from, to) {
  finishEdit();
  if (!from.length) return;
  to.push(snap());
  const s = JSON.parse(from.pop());
  B.board.elements = s.elements; B.board.edges = s.edges;
  B.sel.clear(); B.edgeSel = null;
  commit();
}

// ---------- Монтирование и отрисовка ----------
function leaveBoard() {
  if (!B) return;
  finishEdit();
  B.abort?.();
  B.ro.disconnect();
  B = null;
  document.body.classList.remove('board-open');
}
function showBoard() {
  const board = getBoard(ui.boardId);
  if (!board) { leaveBoard(); setSection('boards'); return; }
  if (B && B.board === board && B.vp.isConnected) { if (!B.editing && !B.busy) paintBoard(); return; }
  leaveBoard();
  document.body.classList.add('board-open');
  const c = $('#content');
  c.innerHTML = `<div class="bv" tabindex="-1">
    <div class="bworld"><svg class="bedges" width="1" height="1"></svg><div class="bitems"></div><svg class="btemp" width="1" height="1"></svg></div>
    <div class="bmarquee"></div>
    <div class="bbar btools">${BOARD_TOOLS.map((t) => (t ? `<button data-tool="${t[0]}" title="${t[1]} — ${t[2]}">${bicon(t[0])}</button>` : '<i></i>')).join('')}<i></i>${BOARD_INSERT.map(([k, t]) => `<button data-insert="${k}" title="${t}">${bicon(k)}</button>`).join('')}</div>
    <div class="bbar bpen"></div>
    <div class="bbar bsel"></div>
    <div class="bbar bhist"><button data-cmd="undo" title="Отменить (Ctrl+Z)">${bicon('undo')}</button><button data-cmd="redo" title="Повторить (Ctrl+Y)">${bicon('redo')}</button><i></i><button data-cmd="export" title="Сохранить как картинку">${bicon('download')}</button></div>
    <div class="bbar bzoom"><button data-cmd="zout" title="Отдалить">${bicon('minus')}</button><button data-cmd="z100" class="bz" title="100% (Ctrl+0)"></button><button data-cmd="zin" title="Приблизить">${bicon('plus')}</button><button data-cmd="fit" title="Показать всё (Shift+1)">${bicon('fit')}</button></div>
    <div class="bhint">Двойной клик — новый стикер · колесо — масштаб · пробел или правая кнопка + перетаскивание — перемещение</div>
  </div>`;
  const vp = $('.bv', c);
  B = {
    board, vp, world: $('.bworld', vp), items: $('.bitems', vp), svg: $('.bedges', vp), temp: $('.btemp', vp),
    tool: 'select', sel: new Set(), edgeSel: null, undo: [], redo: [], editing: null, busy: false, space: false, pen: { color: 'auto', width: 4 },
    abort: null, ro: new ResizeObserver(() => positionSelBar()),
  };
  B.ro.observe(vp);
  if (!board.view) { board.view = { x: 0, y: 0, z: 1 }; requestAnimationFrame(() => B && fitView()); }
  bindBoard(vp);
  setTool('select');
  paintBoard();
  applyView();
  vp.focus({ preventScroll: true });
}

function applyView() {
  const v = B.board.view;
  B.world.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.z})`;
  B.world.style.setProperty('--z', v.z);
  B.vp.style.backgroundSize = `${24 * v.z}px ${24 * v.z}px`;
  B.vp.style.backgroundPosition = `${v.x}px ${v.y}px`;
  $('.bz', B.vp).textContent = Math.round(v.z * 100) + '%';
  positionSelBar();
}
function zoomAt(cx, cy, z) {
  const r = B.vp.getBoundingClientRect(), v = B.board.view;
  z = Math.min(MAXZ, Math.max(MINZ, z));
  const px = cx - r.left, py = cy - r.top;
  v.x = px - ((px - v.x) / v.z) * z;
  v.y = py - ((py - v.y) / v.z) * z;
  v.z = z;
  applyView(); save();
}
const zoomCenter = (z) => { const r = B.vp.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, z); };
function fitView() {
  const els = B.board.elements;
  const r = B.vp.getBoundingClientRect(), v = B.board.view;
  if (!els.length) { Object.assign(v, { x: r.width / 2, y: r.height / 2, z: 1 }); applyView(); return; }
  const b = boundsOf(els);
  v.z = Math.min(1.2, Math.max(MINZ, Math.min((r.width - 160) / b.w, (r.height - 160) / b.h)));
  v.x = (r.width - b.w * v.z) / 2 - b.x * v.z;
  v.y = (r.height - b.h * v.z) / 2 - b.y * v.z;
  applyView(); save();
}

function elInner(e) {
  if (e.type === 'image') return `<img src="${B.board.assets[e.asset] || ''}" draggable="false" alt="">`;
  if (e.type === 'pen') return `<svg viewBox="0 0 ${e.w0} ${e.h0}" preserveAspectRatio="none"><path class="hit" d="${penPath(e)}"/><path class="ink" d="${penPath(e)}" style="stroke:${strokeColor(e.stroke)};stroke-width:${e.width}"/></svg>`;
  if (e.type === 'file') return `${fileBadge(e.file.name)}<div class="bfile-name"><span>${esc(e.file.name)}</span><small>${fmtSize(e.file.size)} · двойной клик — открыть</small></div>`;
  if (e.type === 'note') {
    const n = getNote(e.noteId);
    if (!n || n.trashed) return '<div class="bnote-gone">Заметка удалена</div>';
    const body = n.type === 'list'
      ? n.items.map((i) => `<div class="bci${i.done ? ' done' : ''}" data-item="${i.id}">${icon(i.done ? 'cbOn' : 'cbOff', 16)}<span>${esc(i.text)}</span></div>`).join('')
      : `<div class="bnote-text">${esc(n.content)}</div>`;
    return `${n.images[0] ? `<img src="${n.images[0]}" draggable="false" alt="">` : ''}<div class="bnote-title">${bicon('note', 14)}<span>${esc(n.title || 'Без названия')}</span></div><div class="bnote-body">${body}</div>`;
  }
  const text = `<div class="btext" style="font-size:${e.fs || (e.type === 'text' ? 20 : 15)}px">${esc(e.text)}</div>`;
  if (e.type === 'frame') return `<div class="bframe-title">${text}</div>`;
  if (e.type === 'diamond') return `<div class="bdiamond"></div>${text}`;
  return text;
}
function placeNode(node, e) {
  Object.assign(node.style, { left: e.x + 'px', top: e.y + 'px', width: e.w + 'px', height: e.type === 'text' ? 'auto' : e.h + 'px' });
}
function paintBoard() {
  if (!B) return;
  const frag = document.createDocumentFragment();
  for (const e of B.board.elements) {
    const node = document.createElement('div');
    const note = e.type === 'note' ? getNote(e.noteId) : null;
    node.className = `bel b-${e.type}${B.sel.has(e.id) ? ' sel' : ''}`;
    node.dataset.id = e.id;
    const col = note ? note.color : e.color;
    applyColorEl(node, col);
    placeNode(node, e);
    node.innerHTML = elInner(e);
    if (B.sel.size === 1 && B.sel.has(e.id)) {
      node.insertAdjacentHTML('beforeend', ['nw', 'ne', 'sw', 'se'].map((h) => `<b class="bh ${h}" data-handle="${h}"></b>`).join('')
        + (e.type === 'pen' || e.type === 'frame' ? '' : Object.keys(SIDES).map((s) => `<b class="bc ${s}" data-conn="${s}" title="Потяните, чтобы провести стрелку"></b>`).join('')));
    }
    frag.appendChild(node);
  }
  B.items.replaceChildren(frag);
  // Высота текстовых блоков подстраивается под содержимое
  B.items.querySelectorAll('.b-text').forEach((n) => { const e = elById(n.dataset.id); if (e) e.h = Math.max(30, n.offsetHeight); });
  paintEdges();
  paintSelBar();
  B.vp.classList.toggle('empty', !B.board.elements.length && !B.board.edges.length);
  $('[data-cmd="undo"]', B.vp).disabled = !B.undo.length;
  $('[data-cmd="redo"]', B.vp).disabled = !B.redo.length;
}
function edgeSVG(edge) {
  const g = edgeGeom(edge), col = strokeColor(edge.color);
  return `<g class="bedge${B.edgeSel === edge.id ? ' sel' : ''}" data-edge="${edge.id}"><path class="hit" d="${g.d}"/><path class="line" d="${g.d}" style="stroke:${col}"${edge.dash ? ' stroke-dasharray="8 7"' : ''}/>`
    + (edge.head ? `<polygon points="${g.head.map((p) => p.join(',')).join(' ')}" style="fill:${col}"/>` : '')
    + (edge.label ? `<text x="${g.mid.x}" y="${g.mid.y}">${esc(edge.label)}</text>` : '') + '</g>';
}
function paintEdges() { B.svg.innerHTML = B.board.edges.map(edgeSVG).join(''); }

// ---------- Панель выделения ----------
function paintSelBar() {
  const bar = $('.bsel', B.vp);
  const els = [...B.sel].map(elById).filter(Boolean);
  const edge = B.board.edges.find((x) => x.id === B.edgeSel);
  if (!els.length && !edge) { bar.classList.remove('show'); return; }
  const btn = (cmd, ic, t) => `<button data-sel="${cmd}" title="${t}">${bicon(ic, 18)}</button>`;
  let h = '';
  if (edge) h = btn('color', 'color', 'Цвет') + btn('head', 'arrow', 'Наконечник стрелки') + btn('dash', 'dash', 'Пунктир') + btn('swap', 'swap', 'Развернуть') + btn('label', 'label', 'Подпись') + btn('delete', 'trash', 'Удалить');
  else {
    const one = els.length === 1 ? els[0] : null;
    if (els.some((e) => !['image', 'note', 'file'].includes(e.type))) h += btn('color', 'color', 'Цвет');
    if (els.some((e) => ['sticky', 'text', 'rect', 'ellipse', 'diamond', 'frame'].includes(e.type))) h += btn('smaller', 'smaller', 'Меньше шрифт') + btn('bigger', 'bigger', 'Крупнее шрифт');
    if (one && ['sticky', 'text'].includes(one.type)) h += btn('tonote', 'note', 'Превратить в заметку');
    h += btn('front', 'front', 'На передний план') + btn('back', 'back', 'На задний план') + btn('duplicate', 'copy', 'Дублировать (Ctrl+D)') + btn('delete', 'trash', 'Удалить (Delete)');
  }
  bar.innerHTML = h;
  bar.classList.add('show');
  positionSelBar();
}
function positionSelBar() {
  if (!B) return;
  const bar = $('.bsel', B.vp);
  if (!bar.classList.contains('show')) return;
  const v = B.board.view;
  const els = [...B.sel].map(elById).filter(Boolean);
  let x, y, h = 0;
  if (els.length) { const b = boundsOf(els); x = b.x + b.w / 2; y = b.y; h = b.h; } else {
    const edge = B.board.edges.find((e) => e.id === B.edgeSel);
    if (!edge) return;
    ({ x, y } = edgeGeom(edge).mid);
  }
  const W = B.vp.clientWidth, H = B.vp.clientHeight, bw = bar.offsetWidth;
  let top = y * v.z + v.y - 62;
  if (top < 62) top = (y + h) * v.z + v.y + 20;
  bar.style.left = Math.max(8, Math.min(W - bw - 8, x * v.z + v.x - bw / 2)) + 'px';
  bar.style.top = Math.max(8, Math.min(H - 110, top)) + 'px';
}
function selAct(cmd, btn) {
  const els = [...B.sel].map(elById).filter(Boolean);
  const edge = B.board.edges.find((x) => x.id === B.edgeSel);
  if (cmd === 'delete') return deleteSelection();
  if (cmd === 'duplicate') return duplicateSelection();
  if (cmd === 'color') {
    if (edge) {
      menuPopover(btn, [['Цвет текста', 'auto'], ['Красный', '#ff5c5c'], ['Жёлтый', '#f5b400'], ['Зелёный', '#3ecf8e'], ['Синий', '#4da3ff'], ['Фиолетовый', '#b57bff']].map(([t, c]) => [t, () => change(() => { edge.color = c; })]));
    } else if (els.every((e) => e.type === 'pen')) {
      menuPopover(btn, [['Цвет текста', 'auto'], ['Красный', '#ff5c5c'], ['Жёлтый', '#f5b400'], ['Зелёный', '#3ecf8e'], ['Синий', '#4da3ff'], ['Фиолетовый', '#b57bff']].map(([t, c]) => [t, () => change(() => els.forEach((e) => { e.stroke = c; }))]));
    } else {
      const before = snap();
      colorPopover(btn, els[0].color, (c) => { pushHistory(before); els.forEach((e) => { if (e.type === 'pen') e.stroke = isHex(c) ? c : 'auto'; else e.color = c; }); commit(); });
    }
    return;
  }
  if (edge) {
    if (cmd === 'head') change(() => { edge.head = !edge.head; });
    if (cmd === 'dash') change(() => { edge.dash = !edge.dash; });
    if (cmd === 'swap') change(() => { [edge.a, edge.b] = [edge.b, edge.a]; });
    if (cmd === 'label') editEdgeLabel(edge);
    return;
  }
  if (cmd === 'bigger' || cmd === 'smaller') {
    change(() => els.forEach((e) => {
      const cur = e.fs || (e.type === 'text' ? 20 : 15);
      const next = cmd === 'bigger' ? FONT_SIZES.find((s) => s > cur) : [...FONT_SIZES].reverse().find((s) => s < cur);
      if (next) e.fs = next;
    }));
  }
  if (cmd === 'front' || cmd === 'back') {
    change(() => {
      const rest = B.board.elements.filter((e) => !B.sel.has(e.id));
      B.board.elements = cmd === 'front' ? [...rest, ...els] : [...els, ...rest];
    });
  }
  if (cmd === 'tonote') {
    const e = els[0];
    const lines = (e.text || '').split('\n');
    const n = newNote({ title: lines[0].slice(0, 100), content: lines.slice(1).join('\n'), color: e.color, folderId: B.board.folderId, order: nextOrder() });
    state.notes.push(n);
    change(() => { Object.assign(e, { type: 'note', noteId: n.id, text: '', w: Math.max(e.w, 240), h: Math.max(e.h, 160) }); });
    renderPanel();
    showSnack('Создана заметка из стикера');
  }
}
async function editEdgeLabel(edge) {
  const v = await promptDialog('Подпись стрелки (пусто — убрать)', edge.label || '');
  if (!B || v === null) return;
  change(() => { edge.label = v; });
}

// ---------- Действия ----------
function setTool(t) {
  B.tool = t;
  B.vp.dataset.tool = t;
  B.vp.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
  const pen = $('.bpen', B.vp);
  pen.classList.toggle('show', t === 'pen');
  if (t === 'pen') paintPenBar();
}
function paintPenBar() {
  $('.bpen', B.vp).innerHTML = PEN_COLORS.map((c) => `<button data-pen-color="${c}" class="${B.pen.color === c ? 'on' : ''}" title="Цвет"><span class="dot" style="background:${strokeColor(c)}"></span></button>`).join('')
    + '<i></i>' + PEN_WIDTHS.map((w) => `<button data-pen-width="${w}" class="${B.pen.width === w ? 'on' : ''}" title="Толщина ${w}"><span class="dot" style="width:${w + 3}px;height:${w + 3}px;background:currentColor"></span></button>`).join('');
}
function select(ids, add = false) {
  if (!add) B.sel.clear();
  ids.forEach((i) => B.sel.add(i));
  B.edgeSel = null;
  paintBoard();
}
function addElement(el, { edit = false } = {}) {
  change(() => { if (el.type === 'frame') B.board.elements.unshift(el); else B.board.elements.push(el); B.sel = new Set([el.id]); B.edgeSel = null; });
  setTool('select');
  if (edit) startEdit(el.id, true);
}
function addAt(type, p, extra = {}) {
  const [w, h] = extra.w ? [extra.w, extra.h] : SIZES[type];
  addElement(mk(type, Math.round(p.x - w / 2), Math.round(p.y - h / 2), extra), { edit: ['sticky', 'text'].includes(type) && !extra.text });
}
function deleteSelection() {
  if (!B.sel.size && !B.edgeSel) return;
  change(() => {
    B.board.edges = B.board.edges.filter((e) => e.id !== B.edgeSel && !B.sel.has(e.a.id) && !B.sel.has(e.b.id));
    B.board.elements = B.board.elements.filter((e) => !B.sel.has(e.id));
    B.sel.clear(); B.edgeSel = null;
  });
}
function copyData() {
  const els = B.board.elements.filter((e) => B.sel.has(e.id));
  if (!els.length) return null;
  const edges = B.board.edges.filter((e) => B.sel.has(e.a.id) && B.sel.has(e.b.id));
  const assets = {};
  els.forEach((e) => { if (e.asset) assets[e.asset] = B.board.assets[e.asset]; });
  return JSON.parse(JSON.stringify({ elements: els, edges, assets }));
}
function insertData(data, dx, dy) {
  change(() => {
    const map = {};
    const els = JSON.parse(JSON.stringify(data.elements)).map((e) => { const id = uid(); map[e.id] = id; return { ...e, id, x: e.x + dx, y: e.y + dy }; });
    Object.assign(B.board.assets, data.assets);
    B.board.elements.push(...els);
    B.board.edges.push(...data.edges.map((e) => ({ ...e, id: uid(), a: { ...e.a, id: map[e.a.id] }, b: { ...e.b, id: map[e.b.id] } })));
    B.sel = new Set(els.map((e) => e.id)); B.edgeSel = null;
  });
}
function duplicateSelection() { const d = copyData(); if (d) insertData(d, 24, 24); }

async function addImages(urls, p) {
  let offset = 0;
  pushHistory();
  const ids = [];
  for (const url of urls) {
    const img = await loadImg(url);
    if (!B) return;
    const k = Math.min(1, 360 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(40, Math.round(img.naturalWidth * k)), h = Math.max(40, Math.round(img.naturalHeight * k));
    const asset = uid();
    B.board.assets[asset] = url;
    const el = { id: uid(), type: 'image', asset, x: Math.round(p.x - w / 2 + offset), y: Math.round(p.y - h / 2 + offset), w, h };
    B.board.elements.push(el); ids.push(el.id); offset += 30;
  }
  B.sel = new Set(ids); commit();
}
function addFileElements(metas, p) {
  if (!metas.length) return;
  change(() => {
    const els = metas.map((file, i) => mk('file', Math.round(p.x - 125), Math.round(p.y - 35 + i * 82), { file }));
    B.board.elements.push(...els); B.sel = new Set(els.map((e) => e.id));
  });
}
async function addDroppedToBoard(files, p) {
  const imgs = files.filter((f) => f.type.startsWith('image/'));
  const other = files.filter((f) => !f.type.startsWith('image/'));
  if (imgs.length) await addImages((await Promise.all(imgs.map((f) => fileToDataUrl(f)))).filter(Boolean), p);
  if (other.length) { const metas = await importFileObjects(other); if (B) addFileElements(metas, { x: p.x, y: p.y + (imgs.length ? 220 : 0) }); }
}
function notePicker(anchor) {
  const c = document.createElement('div');
  c.className = 'lbl-pop note-pick';
  c.innerHTML = '<div class="pop-title">Заметка на доску</div><div class="lbl-search"><input type="text" placeholder="Найти заметку"></div><div class="lbl-list"></div><button class="menu-item lbl-create" data-new="1"></button>';
  const inp = $('input', c), list = $('.lbl-list', c), nb = $('[data-new]', c);
  nb.innerHTML = `${icon('add', 18)}<span>Новая заметка</span>`;
  const put = (id) => { closePopover(); addAt('note', viewCenter(), { w: SIZES.note[0], h: SIZES.note[1], noteId: id }); };
  function paint() {
    const q = inp.value.trim().toLowerCase();
    const found = state.notes.filter((n) => !n.trashed && (!q || matches(n, q))).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 50);
    list.innerHTML = found.map((n) => `<button class="menu-item" data-id="${n.id}">${icon(n.type === 'list' ? 'cbOn' : 'bulb', 16)}<span>${esc(n.title || noteAsText(n).split('\n')[0] || 'Без названия')}</span></button>`).join('') || '<div class="tree-hint">Ничего не найдено</div>';
    popover?.reposition();
  }
  list.addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) put(b.dataset.id); });
  nb.addEventListener('click', () => {
    const n = newNote({ folderId: B.board.folderId, order: nextOrder() });
    state.notes.push(n);
    put(n.id);
    openNoteModal(n.id);
  });
  inp.addEventListener('input', paint);
  paint();
  openPopover(anchor, c);
  inp.focus();
}

// ---------- Редактирование текста ----------
function startEdit(id, isNew = false) {
  finishEdit();
  const e = elById(id);
  const t = B.items.querySelector(`.bel[data-id="${id}"] .btext`);
  if (!e || !t) return;
  const before = snap();
  t.contentEditable = 'plaintext-only';
  t.textContent = e.text;
  t.closest('.bel').classList.add('editing');
  const onInput = () => {
    e.text = t.innerText.replace(/\n$/, '');
    if (e.type === 'text') e.h = Math.max(30, t.closest('.bel').offsetHeight);
    paintEdges(); save();
  };
  t.addEventListener('input', onInput);
  t.addEventListener('blur', () => finishEdit(), { once: true });
  B.editing = { id, t, before, onInput, isNew };
  t.focus({ preventScroll: true });
  const range = document.createRange();
  range.selectNodeContents(t); range.collapse(false);
  getSelection().removeAllRanges(); getSelection().addRange(range);
}
function finishEdit() {
  if (!B?.editing) return;
  const { id, t, before, onInput, isNew } = B.editing;
  B.editing = null;
  t.removeEventListener('input', onInput);
  t.blur();
  const e = elById(id);
  if (!e) return;
  if (e.type === 'text' && !e.text.trim()) {
    if (!isNew) pushHistory(before);
    B.board.elements = B.board.elements.filter((x) => x !== e);
    B.sel.delete(id);
    commit();
  } else if (JSON.parse(before).elements.find((x) => x.id === id)?.text !== e.text) { pushHistory(before); commit(); } else paintBoard();
}

// ---------- Мышь ----------
// Подписывается на движение и отпускание кнопки на время одного жеста
function gesture(move, up) {
  const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end); if (B) { B.busy = false; B.abort = null; } };
  const end = (ev) => { stop(); if (B) up(ev); };
  B.busy = true; B.abort = stop;
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
}
const elementAt = (cx, cy) => document.elementFromPoint(cx, cy)?.closest?.('.bel');
function startPan(ev) {
  const v = B.board.view, sx = ev.clientX, sy = ev.clientY, ox = v.x, oy = v.y;
  B.vp.classList.add('panning');
  gesture((m) => { v.x = ox + m.clientX - sx; v.y = oy + m.clientY - sy; applyView(); }, () => { B.vp.classList.remove('panning'); save(); });
}
function startMove(ev, start) {
  const before = snap();
  const ids = new Set(B.sel);
  // Рамка перемещает всё, что лежит внутри неё
  B.board.elements.filter((e) => ids.has(e.id) && e.type === 'frame').forEach((f) => B.board.elements.forEach((e) => { if (inside(f, e)) ids.add(e.id); }));
  const moving = B.board.elements.filter((e) => ids.has(e.id)).map((e) => ({ e, x: e.x, y: e.y, node: B.items.querySelector(`.bel[data-id="${e.id}"]`) }));
  const freeEnds = B.board.edges.flatMap((g) => [g.a, g.b]).filter((p) => !p.id && B.board.elements.some((f) => ids.has(f.id) && f.type === 'frame' && inside(f, { x: p.x, y: p.y, w: 0, h: 0 }))).map((p) => ({ p, x: p.x, y: p.y }));
  let moved = false;
  gesture((m) => {
    const p = toWorld(m.clientX, m.clientY);
    let dx = p.x - start.x, dy = p.y - start.y;
    if (!moved && Math.hypot(m.clientX - ev.clientX, m.clientY - ev.clientY) < 4) return;
    moved = true;
    if (m.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
    moving.forEach((o) => { o.e.x = Math.round(o.x + dx); o.e.y = Math.round(o.y + dy); placeNode(o.node, o.e); });
    freeEnds.forEach((o) => { o.p.x = o.x + dx; o.p.y = o.y + dy; });
    paintEdges(); $('.bsel', B.vp).classList.remove('show');
  }, () => { if (moved) { pushHistory(before); commit(); } else paintSelBar(); });
}
function startResize(ev, handle) {
  const e = elById([...B.sel][0]);
  const before = snap(), o = { x: e.x, y: e.y, w: e.w, h: e.h }, start = toWorld(ev.clientX, ev.clientY);
  const node = B.items.querySelector(`.bel[data-id="${e.id}"]`);
  let changed = false;
  gesture((m) => {
    const p = toWorld(m.clientX, m.clientY);
    const dx = (p.x - start.x) * (handle.includes('w') ? -1 : 1), dy = (p.y - start.y) * (handle.includes('n') ? -1 : 1);
    let w = Math.max(40, o.w + dx), h = Math.max(30, o.h + dy);
    // Картинки сохраняют пропорции (с Shift — свободно); для остальных наоборот
    if ((e.type === 'image') !== m.shiftKey) { const k = Math.max(w / o.w, h / o.h); w = o.w * k; h = o.h * k; }
    if (e.type === 'pen') { w = Math.max(4, o.w + dx); h = Math.max(4, o.h + dy); }
    e.w = Math.round(w); e.h = Math.round(h);
    e.x = Math.round(handle.includes('w') ? o.x + o.w - e.w : o.x);
    e.y = Math.round(handle.includes('n') ? o.y + o.h - e.h : o.y);
    changed = true;
    placeNode(node, e);
    if (e.type === 'text') e.h = node.offsetHeight;
    paintEdges(); $('.bsel', B.vp).classList.remove('show');
  }, () => { if (changed) { pushHistory(before); commit(); } });
}
function startEdge(ev, from, fromDot) {
  const draft = { id: uid(), a: from, b: toWorld(ev.clientX, ev.clientY), color: 'auto', head: true, dash: false, label: '' };
  let target = null;
  const mark = (n) => { B.items.querySelectorAll('.target').forEach((x) => x.classList.remove('target')); n?.classList.add('target'); };
  gesture((m) => {
    const hit = elementAt(m.clientX, m.clientY);
    const el = hit && elById(hit.dataset.id);
    target = el && el.id !== from.id && !['pen', 'frame'].includes(el.type) ? el : null;
    draft.b = target ? { id: target.id } : toWorld(m.clientX, m.clientY);
    mark(target ? hit : null);
    B.temp.innerHTML = edgeSVG(draft);
  }, (u) => {
    B.temp.innerHTML = ''; mark(null);
    const far = Math.hypot(u.clientX - ev.clientX, u.clientY - ev.clientY) > 20;
    if (!far) { paintBoard(); return; }
    if (target) { change(() => { B.board.edges.push(draft); B.sel.clear(); B.edgeSel = draft.id; }); setTool('select'); return; }
    if (fromDot) { // из точки в пустое место — новый связанный стикер
      const p = toWorld(u.clientX, u.clientY);
      const s = mk('sticky', Math.round(p.x - 100), Math.round(p.y - 80), { color: elById(from.id)?.type === 'sticky' ? elById(from.id).color : 'sand' });
      draft.b = { id: s.id }; delete draft.a.side;
      change(() => { B.board.elements.push(s); B.board.edges.push(draft); B.sel = new Set([s.id]); });
      startEdit(s.id);
      return;
    }
    change(() => { B.board.edges.push(draft); B.sel.clear(); B.edgeSel = draft.id; });
    setTool('select');
  });
}
function startPen(ev) {
  const pts = [toWorld(ev.clientX, ev.clientY)];
  const draw = () => { B.temp.innerHTML = `<path class="ink" d="${penPath({ points: pts.map((p) => [p.x, p.y]) })}" style="stroke:${strokeColor(B.pen.color)};stroke-width:${B.pen.width}"/>`; };
  draw();
  gesture((m) => {
    const p = toWorld(m.clientX, m.clientY), l = pts[pts.length - 1];
    if (Math.hypot(p.x - l.x, p.y - l.y) * B.board.view.z < 2) return;
    pts.push(p); draw();
  }, () => {
    B.temp.innerHTML = '';
    const pad = B.pen.width;
    const x = Math.min(...pts.map((p) => p.x)) - pad, y = Math.min(...pts.map((p) => p.y)) - pad;
    const w = Math.max(...pts.map((p) => p.x)) - x + pad, h = Math.max(...pts.map((p) => p.y)) - y + pad;
    const r = (n) => Math.round(n * 10) / 10;
    change(() => { B.board.elements.push({ id: uid(), type: 'pen', x: r(x), y: r(y), w: r(w), h: r(h), w0: r(w), h0: r(h), stroke: B.pen.color, width: B.pen.width, points: pts.map((p) => [r(p.x - x), r(p.y - y)]) }); });
  });
}
function startErase(ev) {
  const before = snap();
  let erased = false;
  let last = { x: ev.clientX, y: ev.clientY };
  const eraseAt = (x, y) => {
    const node = document.elementFromPoint(x, y)?.closest('.b-pen');
    if (!node) return;
    B.board.elements = B.board.elements.filter((e) => e.id !== node.dataset.id);
    node.remove(); erased = true;
  };
  // Проверяем весь отрезок между событиями, чтобы быстрое движение не пропускало линии
  const erase = (m) => {
    const dx = m.clientX - last.x, dy = m.clientY - last.y;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 5));
    for (let i = 1; i <= steps; i++) eraseAt(last.x + (dx * i) / steps, last.y + (dy * i) / steps);
    last = { x: m.clientX, y: m.clientY };
  };
  erase(ev);
  gesture(erase, () => { if (erased) { pushHistory(before); commit(); } });
}
function startDrawBox(ev, type) {
  const a = toWorld(ev.clientX, ev.clientY);
  let box = null;
  gesture((m) => {
    const p = toWorld(m.clientX, m.clientY);
    box = { x: Math.min(a.x, p.x), y: Math.min(a.y, p.y), w: Math.abs(p.x - a.x), h: Math.abs(p.y - a.y) };
    B.temp.innerHTML = `<rect class="ghost" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="8"/>`;
  }, () => {
    B.temp.innerHTML = '';
    if (box && box.w > 30 && box.h > 20) {
      addElement(mk(type, Math.round(box.x), Math.round(box.y), { w: Math.round(box.w), h: Math.round(box.h), text: type === 'frame' ? 'Рамка' : '' }), { edit: ['sticky', 'text'].includes(type) });
    } else addAt(type, a, type === 'frame' ? { text: 'Рамка', w: SIZES.frame[0], h: SIZES.frame[1] } : {});
  });
}
function startMarquee(ev) {
  const m = $('.bmarquee', B.vp), r = B.vp.getBoundingClientRect();
  const a = toWorld(ev.clientX, ev.clientY);
  const base = ev.shiftKey ? new Set(B.sel) : new Set();
  if (!ev.shiftKey && (B.sel.size || B.edgeSel)) { B.sel.clear(); B.edgeSel = null; paintBoard(); }
  gesture((mv) => {
    Object.assign(m.style, { display: 'block', left: Math.min(ev.clientX, mv.clientX) - r.left + 'px', top: Math.min(ev.clientY, mv.clientY) - r.top + 'px', width: Math.abs(mv.clientX - ev.clientX) + 'px', height: Math.abs(mv.clientY - ev.clientY) + 'px' });
    const p = toWorld(mv.clientX, mv.clientY);
    const box = { x: Math.min(a.x, p.x), y: Math.min(a.y, p.y), w: Math.abs(p.x - a.x), h: Math.abs(p.y - a.y) };
    B.sel = new Set(base);
    B.board.elements.forEach((e) => { if (e.type === 'frame' ? inside(box, e) : intersects(box, e)) B.sel.add(e.id); });
    B.items.querySelectorAll('.bel').forEach((n) => n.classList.toggle('sel', B.sel.has(n.dataset.id)));
  }, () => { m.style.display = 'none'; paintBoard(); });
}

function onPointerDown(ev) {
  if (ev.target.closest('.bbar')) return;
  if (B.editing && B.editing.t.contains(ev.target)) return;
  finishEdit();
  B.vp.focus({ preventScroll: true });
  closePopover();
  if (ev.button === 1 || ev.button === 2 || B.space || B.tool === 'hand') { ev.preventDefault(); startPan(ev); return; }
  if (ev.button !== 0) return;
  ev.preventDefault();
  const handle = ev.target.closest('[data-handle]');
  if (handle) { startResize(ev, handle.dataset.handle); return; }
  const dot = ev.target.closest('[data-conn]');
  if (dot) { startEdge(ev, { id: dot.closest('.bel').dataset.id, side: dot.dataset.conn }, true); return; }
  const p = toWorld(ev.clientX, ev.clientY);
  const node = ev.target.closest('.bel');
  if (B.tool === 'pen') { startPen(ev); return; }
  if (B.tool === 'eraser') { startErase(ev); return; }
  if (B.tool === 'arrow') {
    const el = node && elById(node.dataset.id);
    startEdge(ev, el && !['pen', 'frame'].includes(el.type) ? { id: el.id } : p, false);
    return;
  }
  if (B.tool === 'sticky' || B.tool === 'text') { addAt(B.tool, p); return; }
  if (['rect', 'ellipse', 'diamond', 'frame'].includes(B.tool)) { startDrawBox(ev, B.tool); return; }
  const check = ev.target.closest('.bci');
  if (check && node) {
    const n = getNote(elById(node.dataset.id)?.noteId);
    const item = n?.items.find((i) => i.id === check.dataset.item);
    if (item) { item.done = !item.done; touch(n); save(); paintBoard(); return; }
  }
  const edge = ev.target.closest('[data-edge]');
  if (edge) { B.sel.clear(); B.edgeSel = edge.dataset.edge; paintBoard(); return; }
  if (node) {
    const id = node.dataset.id;
    if (ev.shiftKey || ev.ctrlKey) {
      if (B.sel.has(id)) B.sel.delete(id); else B.sel.add(id);
      B.edgeSel = null; paintBoard();
      if (!B.sel.has(id)) return;
    } else if (!B.sel.has(id)) select([id]);
    startMove(ev, p);
    return;
  }
  startMarquee(ev);
}
function onDblClick(ev) {
  if (ev.target.closest('.bbar') || (B.editing && B.editing.t.contains(ev.target))) return;
  if (B.tool !== 'select') return;
  const hit = document.elementFromPoint(ev.clientX, ev.clientY);
  const edge = hit?.closest('[data-edge]');
  if (edge) { const g = B.board.edges.find((x) => x.id === edge.dataset.edge); if (g) editEdgeLabel(g); return; }
  const node = hit?.closest('.bel');
  const e = node && elById(node.dataset.id);
  if (!e) { addAt('sticky', toWorld(ev.clientX, ev.clientY)); return; }
  if (e.type === 'note') { if (!hit.closest('.bci') && getNote(e.noteId)) openNoteModal(e.noteId); } else if (e.type === 'file') openFileMeta(e.file);
  else if (e.type === 'image') openImageViewer(B.board.assets[e.asset]);
  else if (e.type !== 'pen') startEdit(e.id);
}
function bindBoard(vp) {
  vp.addEventListener('pointerdown', onPointerDown);
  vp.addEventListener('dblclick', onDblClick);
  vp.addEventListener('contextmenu', (e) => { if (!e.target.closest('.editing')) e.preventDefault(); });
  vp.addEventListener('wheel', (e) => {
    e.preventDefault();
    const v = B.board.view;
    if (!e.ctrlKey && (e.shiftKey || e.deltaX)) { v.x -= e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX; v.y -= e.shiftKey && !e.deltaX ? 0 : e.deltaY; applyView(); save(); return; }
    zoomAt(e.clientX, e.clientY, v.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.008 : 0.0015)));
  }, { passive: false });
  // Перетаскивание не должно прокручивать холст
  vp.addEventListener('scroll', () => { vp.scrollTop = 0; vp.scrollLeft = 0; });
  vp.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
  vp.addEventListener('drop', (e) => {
    const files = [...e.dataTransfer.files];
    if (!files.length) return;
    e.preventDefault();
    addDroppedToBoard(files, toWorld(e.clientX, e.clientY));
  });
  vp.addEventListener('click', (e) => {
    const t = e.target.closest('.bbar button');
    if (!t) return;
    const d = t.dataset;
    if (d.tool) setTool(d.tool);
    else if (d.insert === 'note') notePicker(t);
    else if (d.insert === 'image') pickImages((urls) => B && addImages(urls, viewCenter()));
    else if (d.insert === 'file') window.api.pickFiles().then((m) => B && addFileElements(m, viewCenter()));
    else if (d.penColor) { B.pen.color = d.penColor; paintPenBar(); } else if (d.penWidth) { B.pen.width = +d.penWidth; paintPenBar(); } else if (d.sel) selAct(d.sel, t);
    else if (d.cmd === 'undo') stepHistory(B.undo, B.redo);
    else if (d.cmd === 'redo') stepHistory(B.redo, B.undo);
    else if (d.cmd === 'export') exportBoardPNG(B.board);
    else if (d.cmd === 'zin') zoomCenter(B.board.view.z * 1.25);
    else if (d.cmd === 'zout') zoomCenter(B.board.view.z / 1.25);
    else if (d.cmd === 'z100') zoomCenter(1);
    else if (d.cmd === 'fit') fitView();
  });
}

// ---------- Клавиатура и буфер обмена ----------
const BOARD_KEYS = { KeyV: 'select', KeyH: 'hand', KeyN: 'sticky', KeyT: 'text', KeyR: 'rect', KeyO: 'ellipse', KeyD: 'diamond', KeyA: 'arrow', KeyP: 'pen', KeyE: 'eraser', KeyF: 'frame' };
// Возвращает true, если нажатие обработано доской
function boardKey(e) {
  if (!B) return false;
  if (B.editing) { if (e.key === 'Escape') finishEdit(); return true; }
  if (e.target.closest?.('input, textarea, select, [contenteditable]')) return false;
  const mod = e.ctrlKey || e.metaKey;
  const done = () => { e.preventDefault(); return true; };
  if (e.code === 'Space') { B.space = true; B.vp.classList.add('space'); return done(); }
  if (e.key === 'Escape') {
    if (B.sel.size || B.edgeSel) { B.sel.clear(); B.edgeSel = null; paintBoard(); } else if (B.tool !== 'select') setTool('select'); else setSection('boards');
    return done();
  }
  if (mod) {
    if (e.code === 'KeyZ') { if (e.shiftKey) stepHistory(B.redo, B.undo); else stepHistory(B.undo, B.redo); return done(); }
    if (e.code === 'KeyY') { stepHistory(B.redo, B.undo); return done(); }
    if (e.code === 'KeyA') { select(B.board.elements.map((x) => x.id)); return done(); }
    if (e.code === 'KeyD') { duplicateSelection(); return done(); }
    if (e.code === 'Digit0') { zoomCenter(1); return done(); }
    return false;
  }
  if (e.altKey) return false;
  if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelection(); return done(); }
  if (e.shiftKey && e.code === 'Digit1') { fitView(); return done(); }
  if (e.key === 'Enter' && B.sel.size === 1) { startEdit([...B.sel][0]); return done(); }
  if (e.key.startsWith('Arrow') && B.sel.size) {
    const s = e.shiftKey ? 20 : 2;
    const [dx, dy] = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
    change(() => B.board.elements.forEach((x) => { if (B.sel.has(x.id)) { x.x += dx; x.y += dy; } }));
    return done();
  }
  if (BOARD_KEYS[e.code]) { setTool(BOARD_KEYS[e.code]); return done(); }
  if (e.key === '/' || e.code === 'Slash') return false;
  return /^Key/.test(e.code) ? done() : false;
}
function bindBoardGlobal() {
  const active = (e) => B && !modal && !dialogs.length && !B.editing && !e.target.closest?.('input, textarea, [contenteditable]');
  document.addEventListener('keyup', (e) => { if (e.code === 'Space' && B) { B.space = false; B.vp.classList.remove('space'); } });
  window.addEventListener('blur', () => { if (B) { B.space = false; B.vp.classList.remove('space'); } });
  document.addEventListener('copy', (e) => {
    if (!active(e)) return;
    const data = copyData();
    if (!data) return;
    const text = data.elements.map((x) => x.text || x.file?.name || getNote(x.noteId)?.title || '').filter(Boolean).join('\n') || 'Элементы доски';
    boardClip = { data, text };
    e.clipboardData.setData('text/plain', text);
    e.preventDefault();
  });
  document.addEventListener('cut', (e) => {
    if (!active(e)) return;
    const data = copyData();
    if (!data) return;
    boardClip = { data, text: 'Элементы доски' };
    e.clipboardData.setData('text/plain', boardClip.text);
    e.preventDefault();
    deleteSelection();
  });
  document.addEventListener('paste', (e) => {
    if (!active(e)) return;
    const files = [...(e.clipboardData?.files || [])];
    const text = e.clipboardData?.getData('text/plain') || '';
    e.preventDefault();
    const c = viewCenter();
    if (files.length) addDroppedToBoard(files, c);
    else if (boardClip && text.replace(/\r/g, '') === boardClip.text) {
      const b = boundsOf(boardClip.data.elements);
      insertData(boardClip.data, Math.round(c.x - b.x - b.w / 2), Math.round(c.y - b.y - b.h / 2));
    } else if (text.trim()) addAt('sticky', c, { text: text.slice(0, 5000), w: 260, h: 200 });
  });
}

// ---------- Экспорт в картинку ----------
function wrapText(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxW) { line = next; continue; }
      if (line) out.push(line);
      line = word;
      while (ctx.measureText(line).width > maxW && line.length > 1) {
        let i = line.length - 1;
        while (i > 1 && ctx.measureText(line.slice(0, i)).width > maxW) i--;
        out.push(line.slice(0, i)); line = line.slice(i);
      }
    }
    out.push(line);
  }
  return out;
}
async function exportBoardPNG(board) {
  if (!board.elements.length && !board.edges.length) { showSnack('Доска пустая — нечего сохранять'); return; }
  if (B) finishEdit();
  const css = getComputedStyle(document.body);
  const textColor = css.getPropertyValue('--text').trim(), bg = css.getPropertyValue('--solid').trim();
  // Пробник для получения цветов элементов из таблицы стилей
  const probe = document.createElement('div');
  document.body.appendChild(probe);
  const fillOf = (color) => { applyColorEl(probe, color); probe.style.background = 'var(--nc, transparent)'; return getComputedStyle(probe).backgroundColor; };
  const ends = board.edges.flatMap((g) => [g.a, g.b]).filter((p) => !p.id).map((p) => ({ x: p.x, y: p.y, w: 0, h: 0 }));
  const box = boundsOf([...board.elements, ...ends]);
  const pad = 60;
  const k = Math.min(2, 8000 / (Math.max(box.w, box.h) + pad * 2));
  const cv = document.createElement('canvas');
  cv.width = Math.ceil((box.w + pad * 2) * k); cv.height = Math.ceil((box.h + pad * 2) * k);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.scale(k, k); ctx.translate(pad - box.x, pad - box.y);
  const col = (c) => (!c || c === 'auto' ? textColor : c);
  const write = (str, x, y, w, h, size, { center = false, bold = false } = {}) => {
    ctx.font = `${bold ? '600 ' : ''}${size}px "Segoe UI", sans-serif`;
    ctx.fillStyle = textColor; ctx.textBaseline = 'top'; ctx.textAlign = center ? 'center' : 'left';
    const lh = size * 1.4;
    const lines = wrapText(ctx, str, w).slice(0, Math.max(1, Math.floor(h / lh)));
    let ty = center ? y + Math.max(0, (h - lines.length * lh) / 2) : y;
    for (const l of lines) { ctx.fillText(l, center ? x + w / 2 : x, ty); ty += lh; }
  };
  const shape = (e) => {
    ctx.beginPath();
    if (e.type === 'ellipse') ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2);
    else if (e.type === 'diamond') { ctx.moveTo(e.x + e.w / 2, e.y); ctx.lineTo(e.x + e.w, e.y + e.h / 2); ctx.lineTo(e.x + e.w / 2, e.y + e.h); ctx.lineTo(e.x, e.y + e.h / 2); ctx.closePath(); } else ctx.roundRect(e.x, e.y, e.w, e.h, e.type === 'sticky' ? 6 : 12);
  };
  const drawEdges = () => {
    const saved = B; B = { board };
    for (const g of board.edges) {
      const geo = edgeGeom(g);
      ctx.strokeStyle = col(g.color); ctx.lineWidth = 2; ctx.setLineDash(g.dash ? [8, 7] : []);
      ctx.stroke(new Path2D(geo.d)); ctx.setLineDash([]);
      if (g.head) { ctx.beginPath(); geo.head.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.closePath(); ctx.fillStyle = col(g.color); ctx.fill(); }
      if (g.label) write(g.label, geo.mid.x - 150, geo.mid.y - 20, 300, 20, 13, { center: true });
    }
    B = saved;
  };
  const ordered = [...board.elements].sort((a, b) => (a.type === 'frame' ? 0 : 1) - (b.type === 'frame' ? 0 : 1));
  let edgesDrawn = false;
  for (const e of ordered) {
    if (!edgesDrawn && e.type !== 'frame') { drawEdges(); edgesDrawn = true; }
    if (e.type === 'pen') {
      ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.w / e.w0, e.h / e.h0);
      ctx.strokeStyle = col(e.stroke); ctx.lineWidth = e.width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.stroke(new Path2D(penPath(e))); ctx.restore(); continue;
    }
    if (e.type === 'image') { try { ctx.drawImage(await loadImg(board.assets[e.asset]), e.x, e.y, e.w, e.h); } catch {} continue; }
    if (e.type === 'text') { write(e.text, e.x + 6, e.y + 4, e.w - 12, e.h + 40, e.fs || 20); continue; }
    const note = e.type === 'note' ? getNote(e.noteId) : null;
    const color = note ? note.color : e.color;
    shape(e);
    const filled = color && color !== 'default';
    ctx.fillStyle = filled ? fillOf(color) : 'rgba(128,128,128,0.12)';
    ctx.globalAlpha = e.type === 'frame' ? 0.5 : 1; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(128,128,128,0.55)'; ctx.lineWidth = 1.5;
    if (e.type !== 'sticky') ctx.stroke();
    if (e.type === 'frame') write(e.text, e.x + 14, e.y + 10, e.w - 28, 24, e.fs || 15, { bold: true });
    else if (e.type === 'note') { if (note) { write(note.title, e.x + 14, e.y + 12, e.w - 28, 22, 15, { bold: true }); write(noteAsText({ ...note, title: '' }), e.x + 14, e.y + 40, e.w - 28, e.h - 50, 13); } } else if (e.type === 'file') write(e.file.name, e.x + 14, e.y + 12, e.w - 28, e.h - 20, 14);
    else write(e.text, e.x + 12, e.y + 10, e.w - 24, e.h - 20, e.fs || 15, { center: e.type !== 'sticky' });
  }
  if (!edgesDrawn) drawEdges();
  probe.remove();
  const a = document.createElement('a');
  a.href = cv.toDataURL('image/png');
  a.download = `${board.name.replace(/[\\/:*?"<>|]/g, '_')}.png`;
  a.click();
}
