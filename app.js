'use strict';
/* «Заметки» — заметки и списки в стиле Keep. Весь интерфейс в одном файле. */

// ---------- Резервный API (запуск в обычном браузере, без Electron) ----------
if (!window.api) {
  const KEY = 'zametki-data';
  window.api = {
    load: async () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
    save: async (d) => localStorage.setItem(KEY, JSON.stringify(d)),
    saveSync: (d) => localStorage.setItem(KEY, JSON.stringify(d)),
    notify: ({ title, body }) => { if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body }); },
    copyText: (t) => navigator.clipboard?.writeText(t),
    setTheme: () => {},
    setBackground: () => {},
    getWallpaper: async () => localStorage.getItem(KEY + '-wall'),
    setWallpaper: async (d) => { try { if (d) localStorage.setItem(KEY + '-wall', d); else localStorage.removeItem(KEY + '-wall'); } catch {} },
    exportData: async (d) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
      a.download = 'zametki.json'; a.click(); return true;
    },
    importData: async () => null,
    pickFiles: () => new Promise((res) => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.multiple = true;
      inp.onchange = async () => res(await Promise.all([...inp.files].map((f) => f.arrayBuffer().then((b) => window.api.addFileData(f.name, f.type, b)))));
      inp.click();
    }),
    addFilePaths: async () => [],
    addFileData: async (name, mime, data) => {
      const blob = new Blob([data], { type: mime || 'application/octet-stream' });
      const dataUrl = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
      return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), name, size: blob.size, stored: null, dataUrl, addedAt: Date.now() };
    },
    openFile: async (f) => { if (!f.dataUrl) return false; const a = document.createElement('a'); a.href = f.dataUrl; a.download = f.name; a.click(); return true; },
    showFile: async () => false,
    saveFileAs: async (f) => window.api.openFile(f),
    cleanupFiles: async () => 0,
    getSysSettings: async () => ({ closeToTray: false, autostart: false, web: true, acrylicSupported: false }),
    setCloseToTray: () => {}, setAutostart: () => {},
    onOpenNote: () => {}, onNewNote: () => {},
  };
}

// ---------- Иконки (Material Icons, Apache 2.0) ----------
const ICONS = {
  calendar: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM7 12h4v4H7z',
  board: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
  search: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  bulb: 'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z',
  bell: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
  bellPlus: 'M10.01 21.01c0 1.1.89 1.99 1.99 1.99s1.99-.89 1.99-1.99h-3.98zm8.87-4.19V11c0-3.25-2.25-5.97-5.29-6.69v-.72C13.59 2.71 12.88 2 12 2s-1.59.71-1.59 1.59v.72A6.873 6.873 0 0 0 5.12 11v5.82L3 18.94V20h18v-1.06l-2.12-2.12zM16 13.01h-3v3h-2v-3H8V11h3V8h2v3h3v2.01z',
  label: 'M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  archive: 'M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5 6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z',
  unarchive: 'M20.55 5.22l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.15.55L3.46 5.22C3.17 5.57 3 6.01 3 6.5V19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.49-.17-.93-.45-1.28zM12 9.5l5.5 5.5H14v2h-4v-2H6.5L12 9.5zM5.12 5l.82-1h12l.93 1H5.12z',
  delete: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  deleteForever: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12 1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z',
  restore: 'M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
  palette: 'M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  image: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
  more: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  pin: 'M14 4v5c0 1.12.37 2.16 1 3H9c.65-.86 1-1.9 1-3V4h4m3-2H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3V4h1c.55 0 1-.45 1-1s-.45-1-1-1z',
  pinOn: 'M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z',
  cbOn: 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-9 14-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  cbOff: 'M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z',
  grid: 'M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z',
  list: 'M20 13H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1zm0-10H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1z',
  dark: 'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z',
  light: 'M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 0 0 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z',
  settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  clock: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
  repeat: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z',
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  drag: 'M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  expandMore: 'M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z',
  expandLess: 'm12 8-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z',
  folder: 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
  folderOutline: 'M9.17 6l2 2H20v10H4V6h5.17M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
  folderNew: 'M20 6h-8l-2-2H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-1 8h-3v3h-2v-3h-3v-2h3V9h2v3h3v2z',
  chevron: 'M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  tag: 'M20 10V8h-4V4h-2v4h-4V4H8v4H4v2h4v4H4v2h4v4h2v-4h4v4h2v-4h4v-2h-4v-4h4zm-6 4h-4v-4h4v4z',
  sidebar: 'M3 5v14h18V5H3zm4 12H5V7h2v10zm12 0H9V7h10v10z',
  wallpaper: 'M4 4h7V2H4c-1.1 0-2 .9-2 2v7h2V4zm6 9-4 5h12l-3-4-2.03 2.71L10 13zm7-4.5c0-.83-.67-1.5-1.5-1.5S14 7.67 14 8.5s.67 1.5 1.5 1.5S17 9.33 17 8.5zM20 2h-7v2h7v7h2V4c0-1.1-.9-2-2-2zm0 18h-7v2h7c1.1 0 2-.9 2-2v-7h-2v7zM4 13H2v7c0 1.1.9 2 2 2h7v-2H4v-7z',
  attach: 'M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z',
  upload: 'M5 20h14v-2H5v2zm0-10h4v6h6v-6h4l-7-7-7 7z',
  folderOpen: 'M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z',
  noColor: 'M18 14c0-4-6-10.8-6-10.8s-1.33 1.51-2.73 3.52l8.59 8.59c.09-.42.14-.86.14-1.31zm-.88 3.12L12.5 12.5 5.27 5.27 4 6.55l3.32 3.32C6.55 11.32 6 12.79 6 14c0 3.31 2.69 6 6 6 1.52 0 2.9-.57 3.96-1.5l2.63 2.63 1.27-1.27-2.74-2.74z',
};
const icon = (name, size = 24) =>
  `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;

const COLORS = [
  ['default', 'Без цвета'], ['coral', 'Коралловый'], ['rose', 'Розовый'], ['peach', 'Персиковый'], ['gold', 'Золотой'], ['sand', 'Песочный'],
  ['lime', 'Лаймовый'], ['mint', 'Мятный'], ['sage', 'Шалфей'], ['teal', 'Бирюзовый'], ['fog', 'Туман'], ['sky', 'Небесный'],
  ['storm', 'Грозовое небо'], ['lavender', 'Лавандовый'], ['dusk', 'Сумерки'], ['blossom', 'Цветение'], ['clay', 'Глина'], ['chalk', 'Мел'],
];
const isHex = (c) => /^#[0-9a-f]{6}$/i.test(c || '');
// Атрибуты цвета для карточки: готовый цвет или свой (#rrggbb)
const colorAttr = (c) => (isHex(c) ? `data-color="custom" style="--nc-raw:${c}"` : `data-color="${esc(c || 'default')}"`);
function applyColorEl(el, c) {
  if (isHex(c)) { el.dataset.color = 'custom'; el.style.setProperty('--nc-raw', c); }
  else { el.dataset.color = c || 'default'; el.style.removeProperty('--nc-raw'); }
}
const REPEATS = [['none', 'Не повторять'], ['daily', 'Ежедневно'], ['weekly', 'Еженедельно'], ['monthly', 'Ежемесячно'], ['yearly', 'Ежегодно']];
const KEEP_COLORS = { DEFAULT: 'default', RED: 'coral', ORANGE: 'peach', YELLOW: 'sand', GREEN: 'mint', TEAL: 'sage', BLUE: 'fog', CERULEAN: 'storm', PURPLE: 'dusk', PINK: 'blossom', BROWN: 'clay', GRAY: 'chalk' };
const TRASH_DAYS = 7;

// ---------- Состояние ----------
const defaultState = () => ({
  version: 3, notes: [], labels: [], folders: [], files: [], boards: [],
  settings: { view: 'grid', theme: 'dark', panelCollapsed: false, panelTab: 'folders', collapsedFolders: [], background: null, blur: 28, designV2: true },
});
let state = defaultState();
const ui = { section: 'notes', labelId: null, folderId: null, boardId: null, restorePanelAfterBoard: false, calendarDate: new Date(), calendarPanelOpen: false, search: '', selected: new Set() };
let sysInfo = { acrylicSupported: false };
let cardDragId = null;

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = (n) => String(n).padStart(2, '0');

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

function newNote(partial = {}) {
  const now = Date.now();
  return {
    id: uid(), title: '', content: '', type: 'text', items: [], color: 'default',
    pinned: false, archived: false, trashed: false, trashedAt: null, labels: [], folderId: null,
    reminder: null, repeat: 'none', reminderFired: false, images: [], files: [],
    createdAt: now, updatedAt: now, order: 0, ...partial,
  };
}
const isEmpty = (n) => !n.title.trim() && !n.content.trim() && !n.items.some((i) => i.text.trim()) && !n.images.length && !(n.files || []).length;
const nextOrder = () => state.notes.reduce((m, n) => Math.max(m, n.order || 0), 0) + 1;
const getNote = (id) => state.notes.find((n) => n.id === id);
const getBoard = (id) => state.boards.find((board) => board.id === id);
function normalizeBoard(value = {}) {
  const board = value && typeof value === 'object' ? value : {};
  const now = Date.now();
  const safeId = (id) => typeof id === 'string' && /^[\w-]{1,80}$/.test(id) ? id : uid();
  const seenIds = new Set();
  const colors = new Set(['sun', 'pink', 'blue', 'mint']);
  const elements = (Array.isArray(board.elements) ? board.elements : []).slice(0, 500).map((element = {}) => {
    let id = safeId(element.id);
    if (seenIds.has(id)) id = uid();
    seenIds.add(id);
    const number = (input, fallback = 0) => Number.isFinite(Number(input)) ? Number(input) : fallback;
    return {
      id,
      type: ['sticky', 'text', 'shape'].includes(element.type) ? element.type : 'sticky',
      x: Math.max(-10000, Math.min(10000, number(element.x))),
      y: Math.max(-10000, Math.min(10000, number(element.y))),
      text: String(element.text ?? '').slice(0, 4000),
      color: colors.has(element.color) ? element.color : 'sun',
    };
  });
  const ids = new Set(elements.map((element) => element.id));
  const links = new Set();
  const connections = (Array.isArray(board.connections) ? board.connections : []).flatMap((connection) => {
    const from = connection?.from;
    const to = connection?.to;
    if (!ids.has(from) || !ids.has(to) || from === to) return [];
    const key = [from, to].sort().join(':');
    if (links.has(key)) return [];
    links.add(key);
    return [{ from, to }];
  }).slice(0, 1000);
  const camera = board.camera && typeof board.camera === 'object' ? board.camera : {};
  const number = (input, fallback = 0) => Number.isFinite(Number(input)) ? Number(input) : fallback;
  return {
    id: safeId(board.id),
    title: String(board.title || 'Новая доска').trim().slice(0, 80) || 'Новая доска',
    elements,
    connections,
    camera: {
      x: Math.max(-10000, Math.min(10000, number(camera.x))),
      y: Math.max(-10000, Math.min(10000, number(camera.y))),
      zoom: Math.max(0.35, Math.min(2.4, number(camera.zoom, 1))),
    },
    createdAt: number(board.createdAt, now),
    updatedAt: number(board.updatedAt, now),
  };
}
const touch = (n) => { n.updatedAt = Date.now(); };
const sortedLabels = () => [...state.labels].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
const labelName = (id) => state.labels.find((l) => l.id === id)?.name;

// ---------- Папки ----------
const getFolder = (id) => state.folders.find((f) => f.id === id);
const folderChildren = (pid) => state.folders.filter((f) => (f.parentId || null) === (pid || null)).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
function folderDescIds(id) { const out = [id]; for (const c of folderChildren(id)) out.push(...folderDescIds(c.id)); return out; }
function folderPath(id) { const out = []; let f = getFolder(id); while (f) { out.unshift(f); f = getFolder(f.parentId); } return out; }
const flatFolders = (pid = null, depth = 0) => folderChildren(pid).flatMap((f) => [{ f, depth }, ...flatFolders(f.id, depth + 1)]);
const activeNotes = () => state.notes.filter((n) => !n.trashed && !n.archived);
function folderCount(id) { const ids = new Set(folderDescIds(id)); return activeNotes().filter((n) => ids.has(n.folderId)).length; }
const notesWord = (k) => `${k} ${plural(k, 'заметка', 'заметки', 'заметок')}`;

// ---------- Сохранение ----------
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveTimer = null; window.api.save(state); }, 300);
}
window.addEventListener('beforeunload', () => {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; window.api.saveSync(state); }
});

// ---------- Форматирование дат ----------
const fmtTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const sameCalendarDay = (a, b) => ymd(a) === ymd(b);
function calendarDateFromKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}
function calendarLabel(date, options) {
  const label = date.toLocaleDateString('ru-RU', options);
  return label.charAt(0).toLocaleUpperCase('ru-RU') + label.slice(1);
}
function dayDiff(d) {
  const a = new Date(d); a.setHours(0, 0, 0, 0);
  const b = new Date(); b.setHours(0, 0, 0, 0);
  return Math.round((a - b) / 864e5);
}
function fmtDay(d) {
  const diff = dayDiff(d);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Завтра';
  if (diff === -1) return 'Вчера';
  const opts = { day: 'numeric', month: 'short' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('ru-RU', opts);
}
const fmtReminder = (iso) => { const d = new Date(iso); return `${fmtDay(d)}, ${fmtTime(d)}`; };
function fmtEdited(ts) {
  const d = new Date(ts);
  const diff = dayDiff(d);
  if (diff === 0) return `Изменено: ${fmtTime(d)}`;
  if (diff === -1) return `Изменено: вчера, ${fmtTime(d)}`;
  return `Изменено: ${fmtDay(d)}`;
}

// ---------- Фильтрация ----------
function matches(n, q) {
  if (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)) return true;
  if (n.items.some((i) => i.text.toLowerCase().includes(q))) return true;
  if ((n.files || []).some((f) => f.name.toLowerCase().includes(q))) return true;
  return n.labels.some((id) => (labelName(id) || '').toLowerCase().includes(q));
}
function visibleNotes() {
  const q = ui.search.trim().toLowerCase();
  let list = state.notes.filter((n) => {
    if (ui.section === 'trash') return n.trashed;
    if (n.trashed) return false;
    if (q) return true; // поиск идёт по всем заметкам, включая архив
    switch (ui.section) {
      case 'notes': return !n.archived;
      case 'reminders': return !!n.reminder;
      case 'archive': return n.archived;
      case 'label': return n.labels.includes(ui.labelId);
      case 'folder': return !n.archived && n.folderId === ui.folderId;
      default: return false;
    }
  });
  if (q) list = list.filter((n) => matches(n, q));
  if (ui.section === 'reminders' && !q) list.sort((a, b) => new Date(a.reminder) - new Date(b.reminder));
  else if (ui.section === 'trash') list.sort((a, b) => (b.trashedAt || 0) - (a.trashedAt || 0));
  else list.sort((a, b) => b.order - a.order);
  return list;
}
const composerAllowed = () => ['notes', 'label', 'reminders', 'folder'].includes(ui.section) && !ui.search;
const canDrag = () => ui.section !== 'trash';
const canReorder = () => ['notes', 'label', 'archive', 'folder'].includes(ui.section) && !ui.search;
const SECTION_TITLES = { notes: 'Все заметки', files: 'Файлы', reminders: 'Напоминания', calendar: 'Календарь', archive: 'Архив', trash: 'Корзина', boards: 'Доски' };

// ---------- Рендер ----------
let renderQueued = false;
function render() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; renderAll(); });
}
function renderAll() { applyTheme(); renderHeader(); renderRail(); renderPanel(); renderComposer(); renderNotes(); renderBoard(); }
const renderSidebar = () => { renderRail(); renderPanel(); };

let notesTimer = null;
function scheduleNotesRender() { clearTimeout(notesTimer); notesTimer = setTimeout(() => { renderNotes(); renderPanel(); }, 400); }

function applyTheme() {
  const dark = state.settings.theme !== 'light';
  document.body.classList.toggle('dark', dark);
  document.body.classList.toggle('light', !dark);
  const tt = $('#themeToggle'); tt.innerHTML = icon(dark ? 'light' : 'dark'); tt.title = dark ? 'Светлая тема' : 'Тёмная тема';
}

let wallpaper = null;
function applyBackground() {
  let mode = state.settings.background || (sysInfo.acrylicSupported ? 'acrylic' : 'gradient');
  if (mode === 'acrylic' && !sysInfo.acrylicSupported) mode = 'gradient';
  if (mode === 'image' && !wallpaper) mode = 'gradient';
  document.body.dataset.bg = mode;
  const layer = $('#bgLayer');
  layer.style.backgroundImage = mode === 'image' ? `url("${wallpaper}")` : '';
  document.body.style.setProperty('--blur', (state.settings.blur ?? 28) + 'px');
  window.api.setBackground(mode);
}

// Заголовок с «хлебными крошками» над заметками
function renderHeader() {
  const grid = state.settings.view === 'grid';
  const boardView = ['boards', 'board'].includes(ui.section);
  const calendarView = ui.section === 'calendar';
  const panelCollapsed = calendarView ? !ui.calendarPanelOpen : !!state.settings.panelCollapsed;
  const panelToggleTitle = calendarView
    ? (panelCollapsed ? 'Показать панель заметок' : 'Скрыть панель заметок')
    : (panelCollapsed ? 'Показать панель' : 'Скрыть панель');
  const vt = $('#viewToggle'); vt.innerHTML = icon(grid ? 'list' : 'grid', 20); vt.title = grid ? 'Список (Ctrl+G)' : 'Сетка (Ctrl+G)';
  vt.style.display = boardView || calendarView ? 'none' : '';
  $('#newNoteBtn').style.display = boardView || calendarView ? 'none' : '';
  $('#searchBox').classList.toggle('has-value', !!ui.search);
  $('#panelExpand').style.display = panelCollapsed ? '' : 'none';
  $('#panelExpand').title = panelToggleTitle;
  $('#panelExpand').setAttribute('aria-label', panelToggleTitle);
  $('#panelCollapse').title = calendarView ? 'Скрыть панель заметок' : 'Скрыть панель';
  $('#panelCollapse').setAttribute('aria-label', $('#panelCollapse').title);
  $('#panel').classList.toggle('collapsed', panelCollapsed);
  const caret = icon('expandMore', 18);
  let h;
  if (ui.search) h = `<span class="crumb cur">Поиск: «${esc(ui.search.trim())}»</span>`;
  else if (ui.section === 'board') {
    const board = getBoard(ui.boardId);
    h = `<button class="crumb" data-key="boards">${icon('board', 18)}Доски</button><span class="sep">/</span><span class="crumb cur board-crumb-title">${esc(board?.title || 'Доска')}</span>`;
  } else if (ui.section === 'boards') h = `<span class="crumb cur">${SECTION_TITLES.boards}</span>`;
  else if (ui.section === 'folder') {
    const path = folderPath(ui.folderId);
    h = '<button class="crumb" data-key="notes">Все заметки</button>' + path.map((f, i) => '<span class="sep">/</span>' + (i < path.length - 1
      ? `<button class="crumb" data-folder="${f.id}">${esc(f.name)}</button>`
      : `<button class="crumb cur" data-act="fmenu" data-folder="${f.id}" title="Действия с папкой">${icon('folder', 18)}${esc(f.name)}${caret}</button>`)).join('');
    const cf = getFolder(ui.folderId);
    if (cf) h += `<span class="crumb-tags">${folderTagsHTML(cf, 'hchip')}<button class="hchip add" data-act="ftags" data-folder="${cf.id}" title="Теги папки">${icon('tag', 14)}${(cf.labels || []).length ? '' : 'Добавить тег'}</button></span>`;
  } else if (ui.section === 'label') {
    h = `<button class="crumb cur" data-act="tmenu" data-label="${ui.labelId}" title="Действия с тегом">#${esc(labelName(ui.labelId) || '')}${caret}</button>`;
  } else h = `<span class="crumb cur">${SECTION_TITLES[ui.section]}</span>`;
  $('#crumbs').innerHTML = h;
}

// Узкая панель с иконками разделов
function renderRail() {
  const cur = ui.section === 'board' ? 'boards' : ['folder', 'label'].includes(ui.section) ? 'notes' : ui.section;
  const remCount = state.notes.filter((n) => n.reminder && !n.trashed && !n.reminderFired).length;
  const items = [['notes', 'bulb', 'Заметки'], ['boards', 'board', 'Доски'], ['reminders', 'bell', 'Напоминания'], ['calendar', 'calendar', 'Календарь'], ['files', 'attach', 'Файлы'], ['archive', 'archive', 'Архив'], ['trash', 'delete', 'Корзина']];
  $('#railNav').innerHTML = items.map(([key, ic, t]) => {
    const active = key === cur && !ui.search;
    return `<button class="rail-item${active ? ' active' : ''}" data-key="${key}" title="${t}" aria-label="${t}"${active ? ' aria-current="page"' : ''}>${icon(ic, 22)}${key === 'reminders' && remCount ? `<span class="rail-badge">${remCount}</span>` : ''}</button>`;
  }).join('');
}

// Панель папок и тегов
function renderPanel() {
  const boardView = ['boards', 'board'].includes(ui.section);
  const title = $('.panel-title');
  const add = $('#panelAdd');
  const tree = $('#tree');
  if (boardView) {
    title.textContent = 'Мои доски';
    $('#searchBox').style.display = 'none';
    $('#seg').style.display = 'none';
    add.innerHTML = icon('add', 18);
    add.title = 'Новая доска';
    add.setAttribute('aria-label', 'Новая доска');
    const boards = [...state.boards].sort((a, b) => b.updatedAt - a.updatedAt);
    tree.innerHTML = boards.length
      ? `<div class="tree-label">Доски</div>${boards.map((board) => {
        const active = ui.section === 'board' && ui.boardId === board.id;
        return `<div class="board-nav-row">
          <button type="button" class="board-nav-button${active ? ' active' : ''}" data-board-open="${esc(board.id)}"${active ? ' aria-current="page"' : ''}>
            ${icon('board', 18)}<span class="board-nav-title">${esc(board.title)}</span><span class="board-nav-count">${board.elements.length}</span>
          </button>
          <button type="button" class="icon-btn tiny board-nav-more" data-board-menu="${esc(board.id)}" title="Действия с доской" aria-label="Действия с доской ${esc(board.title)}">${icon('more', 16)}</button>
        </div>`;
      }).join('')}`
      : '<div class="board-list-empty">Создайте доску, чтобы собрать идеи на одном холсте.</div>';
    return;
  }

  title.textContent = 'Мои заметки';
  $('#searchBox').style.display = '';
  $('#seg').style.display = '';
  const tab = state.settings.panelTab === 'tags' ? 'tags' : 'folders';
  $('#seg').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  add.innerHTML = icon(tab === 'tags' ? 'add' : 'folderNew', 18);
  add.title = tab === 'tags' ? 'Новый тег' : 'Новая папка';
  add.removeAttribute('aria-label');
  if (tab === 'folders') {
    const allActive = ui.section === 'notes' && !ui.search;
    let h = `<div class="titem${allActive ? ' active' : ''}" data-key="notes"><span class="tchev hidden"></span>${icon('bulb', 18)}<span class="tname">Все заметки</span><span class="tcount">${activeNotes().length}</span></div>`;
    h += '<div class="tree-label">Папки</div>';
    h += state.folders.length ? treeHTML(null) : '<button class="tree-empty" data-global="new-folder">+ Создать папку</button>';
    tree.innerHTML = h;
  } else {
    let h = `<div class="tag-new"><span class="muted">${icon('add', 18)}</span><input id="newTag" placeholder="Новый тег" maxlength="50" autocomplete="off"></div>`;
    const labels = sortedLabels();
    h += labels.map((l) => {
      const k = state.notes.filter((n) => !n.trashed && n.labels.includes(l.id)).length + state.folders.filter((f) => (f.labels || []).includes(l.id)).length;
      const active = ui.section === 'label' && ui.labelId === l.id && !ui.search;
      return `<div class="titem${active ? ' active' : ''}" data-label="${l.id}"><span class="thash">#</span><span class="tname">${esc(l.name)}</span><span class="tcount">${k}</span><button class="icon-btn tiny tmore" data-act="tmenu" title="Действия с тегом">${icon('more', 16)}</button></div>`;
    }).join('');
    if (!labels.length) h += '<div class="tree-hint">Теги помогают находить заметки из разных папок. Введите название выше и нажмите Enter.</div>';
    tree.innerHTML = h;
  }
}
function treeHTML(pid) {
  const collapsed = new Set(state.settings.collapsedFolders || []);
  return folderChildren(pid).map((f) => {
    const kids = folderChildren(f.id).length;
    const open = !collapsed.has(f.id);
    const active = ui.section === 'folder' && ui.folderId === f.id && !ui.search;
    return `<div class="tnode"><div class="titem${active ? ' active' : ''}" data-folder="${f.id}">`
      + `<button class="tchev${kids ? '' : ' hidden'}${open ? ' open' : ''}" data-act="toggle">${icon('chevron', 16)}</button>`
      + `${icon(pid ? 'folderOutline' : 'folder', 18)}<span class="tname">${esc(f.name)}</span><span class="tcount">${folderCount(f.id)}</span>`
      + `<button class="icon-btn tiny tmore" data-act="fmenu" title="Действия с папкой">${icon('more', 16)}</button></div>`
      + (kids && open ? `<div class="tchildren">${treeHTML(f.id)}</div>` : '') + '</div>';
  }).join('');
}

// Ширина сетки — кратна ширине карточки, чтобы заголовки секций были выровнены
function updateGridWidth() {
  const w = $('#main').clientWidth - 32;
  let gw;
  if (state.settings.view === 'list') gw = Math.min(600, w);
  else { const cols = Math.max(1, Math.floor((w + 16) / 256)); gw = cols * 256 - 16; }
  $('#content').style.setProperty('--gw', gw + 'px');
}

const ROW = 4, GAP = 16;
function sizeCard(card) {
  const h = card.getBoundingClientRect().height;
  card.style.gridRowEnd = `span ${Math.ceil((h + GAP) / ROW)}`;
}
const cardRO = new ResizeObserver((entries) => entries.forEach((e) => sizeCard(e.target)));

function chipsHTML(n, removable, inEditor = false) {
  let h = '';
  if (n.reminder) {
    const past = n.reminderFired || new Date(n.reminder) < new Date();
    const rep = n.repeat && n.repeat !== 'none';
    h += `<span class="chip${past ? ' past' : ''}" data-act="open-reminder" title="${esc(new Date(n.reminder).toLocaleString('ru-RU'))}${rep ? ' · ' + REPEATS.find((r) => r[0] === n.repeat)[1] : ''}">${icon(rep ? 'repeat' : 'clock', 16)}<span>${esc(fmtReminder(n.reminder))}</span>${removable ? `<button class="chip-x" data-act="rm-reminder" title="Удалить напоминание">${icon('close', 14)}</button>` : ''}</span>`;
  }
  const f = n.folderId && getFolder(n.folderId);
  if (f && (inEditor || !(ui.section === 'folder' && ui.folderId === f.id))) {
    h += `<span class="chip chip-folder" data-act="goto-folder" data-folder="${f.id}" title="${esc(folderPath(f.id).map((x) => x.name).join(' / '))}">${icon('folder', 14)}<span>${esc(f.name)}</span>${removable ? `<button class="chip-x" data-act="rm-folder" title="Убрать из папки">${icon('close', 14)}</button>` : ''}</span>`;
  }
  for (const id of n.labels) {
    const name = labelName(id);
    if (!name) continue;
    h += `<span class="chip" data-act="goto-label" data-label="${id}"><span>#${esc(name)}</span>${removable ? `<button class="chip-x" data-act="rm-label" data-label="${id}" title="Убрать тег">${icon('close', 14)}</button>` : ''}</span>`;
  }
  return h ? `<div class="chips">${h}</div>` : '';
}

const tbBtn = (act, ic, title) => `<button class="icon-btn tb" data-act="${act}" title="${title}">${icon(ic, 18)}</button>`;

function cardHTML(n) {
  const trash = n.trashed;
  const cls = ['card'];
  if (n.pinned) cls.push('pinned');
  if (trash) cls.push('trashed');
  if (ui.selected.has(n.id)) cls.push('selected');
  if (modal && modal.id === n.id) cls.push('editing');
  if (popover && popover.cardId === n.id) cls.push('active');

  const imgs = n.images.length
    ? `<div class="card-images n${Math.min(n.images.length, 3)}">${n.images.slice(0, 6).map((src) => `<img src="${src}" draggable="false" alt="">`).join('')}</div>` : '';
  const title = n.title ? `<div class="card-title">${esc(n.title)}</div>` : '';
  let body = '';
  if (n.type === 'list') {
    const un = n.items.filter((i) => !i.done), dn = n.items.filter((i) => i.done);
    const shown = un.slice(0, 12);
    body = `<div class="card-list">${shown.map((i) => `<div class="ci" data-item="${i.id}"><button class="icon-btn cb" data-act="check" title="Отметить">${icon('cbOff', 18)}</button><span>${esc(i.text)}</span></div>`).join('')}`
      + (un.length > shown.length ? '<div class="ci more">…</div>' : '')
      + (dn.length ? `<div class="done-count">+ ${dn.length} ${plural(dn.length, 'отмеченный пункт', 'отмеченных пункта', 'отмеченных пунктов')}</div>` : '')
      + '</div>';
    if (!n.items.length) body = '';
  } else if (n.content) {
    const short = n.content.length < 400 && n.content.split('\n').length < 14;
    body = `<div class="card-text${short ? ' short' : ''}">${esc(n.content)}</div>`;
  }
  if (!title && !body && !imgs) body = '<div class="card-text empty-note">Пустая заметка</div>';
  const tools = trash
    ? tbBtn('destroy', 'deleteForever', 'Удалить навсегда') + tbBtn('restore', 'restore', 'Восстановить')
    : tbBtn('remind', 'bellPlus', 'Напоминание') + tbBtn('color', 'palette', 'Цвет фона') + tbBtn('image', 'image', 'Добавить картинку') + tbBtn('attach', 'attach', 'Прикрепить файл')
      + tbBtn('archive', n.archived ? 'unarchive' : 'archive', n.archived ? 'Вернуть из архива' : 'Архивировать') + tbBtn('more', 'more', 'Ещё');
  return `<div class="${cls.join(' ')}" data-id="${n.id}" ${colorAttr(n.color)} draggable="${canDrag()}">
    <button class="sel-btn" data-act="select" title="Выбрать заметку">${icon('check', 16)}</button>
    ${imgs}
    ${trash ? '' : `<button class="icon-btn pin-btn" data-act="pin" title="${n.pinned ? 'Открепить' : 'Закрепить'}">${icon(n.pinned ? 'pinOn' : 'pin')}</button>`}
    ${title}${body}${cardFilesHTML(n)}${chipsHTML(n, !trash)}
    <div class="card-toolbar">${tools}</div>
  </div>`;
}

function cardFilesHTML(n) {
  const files = n.files || [];
  if (!files.length) return '';
  return `<div class="card-files">${files.slice(0, 3).map((f) => `<button class="cfile" data-act="open-file" data-file="${f.id}" title="Открыть «${esc(f.name)}»">${fileBadge(f.name, 'xs')}<span>${esc(f.name)}</span></button>`).join('')}`
    + (files.length > 3 ? `<button class="cfile more" data-act="files-more">+ ещё ${files.length - 3}</button>` : '') + '</div>';
}

function emptyHTML(compact = false) {
  if (ui.search) return `<div class="empty">${icon('search')}Ничего не найдено</div>`;
  const map = {
    notes: ['bulb', 'Здесь будут ваши заметки'],
    reminders: ['bell', 'Здесь будут заметки с напоминаниями'],
    archive: ['archive', 'Здесь будут ваши архивированные заметки'],
    trash: ['delete', 'Корзина пуста'],
    label: ['tag', 'Здесь будут заметки с этим тегом'],
    folder: ['folderOutline', 'В этой папке пока нет заметок'],
    files: ['attach', 'Здесь будут ваши файлы'],
  };
  const [ic, text] = map[ui.section];
  return `<div class="empty${compact ? ' compact' : ''}">${icon(ic)}${text}</div>`;
}

// Карточка папки с «стеклянной» обложкой
function folderTagsHTML(f, cls = 'fchip') {
  return (f.labels || []).map((id) => labelName(id) ? `<button class="${cls}" data-act="goto-label" data-label="${id}">#${esc(labelName(id))}</button>` : '').join('');
}
function folderLabelOps(f) {
  return {
    isChecked: (id) => (f.labels || []).includes(id),
    toggle: (id, on) => { f.labels = on ? [...new Set([...(f.labels || []), id])] : (f.labels || []).filter((x) => x !== id); save(); render(); },
  };
}
function fcardHTML(f) {
  const sub = folderChildren(f.id).length;
  const k = folderCount(f.id);
  return `<div class="fcard" data-folder="${f.id}">
    <button class="icon-btn tiny fmore" data-act="fmenu" title="Действия с папкой">${icon('more', 16)}</button>
    <div class="fart"><div class="fback"></div><div class="fpaper p1"></div><div class="fpaper p2"></div><div class="ffront"><span>Заметки</span></div></div>
    <div class="fname">${esc(f.name)}</div>
    <div class="fsub">${notesWord(k)}${sub ? ` · ${sub} ${plural(sub, 'папка', 'папки', 'папок')}` : ''}</div>
    ${(f.labels || []).length ? `<div class="fchips">${folderTagsHTML(f)}</div>` : ''}
  </div>`;
}

function boardGalleryHTML() {
  const boards = [...state.boards].sort((a, b) => b.updatedAt - a.updatedAt);
  const cards = boards.map((board) => {
    const preview = board.elements.slice(0, 3).map((element) =>
      `<span class="board-preview-node" data-color="${esc(element.color || 'sun')}">${esc(element.text || 'Новая идея').slice(0, 42)}</span>`).join('');
    const count = board.elements.length;
    return `<button type="button" class="board-gallery-card" data-board-open="${esc(board.id)}" aria-label="Открыть доску ${esc(board.title)}">
      <span class="board-gallery-preview" aria-hidden="true">${preview || '<span class="board-preview-empty">Пустая доска</span>'}</span>
      <span class="board-gallery-card-info"><span class="board-gallery-card-title">${esc(board.title)}</span><span class="board-gallery-card-meta">${count} ${plural(count, 'элемент', 'элемента', 'элементов')} · ${esc(fmtDay(new Date(board.updatedAt)))}</span></span>
    </button>`;
  }).join('');
  return `<div class="board-gallery">
    <div class="board-gallery-head"><div><h2>Доски</h2><p>Собирайте мысли, заметки и связи на одном холсте.</p></div><button type="button" class="text-btn primary" data-global="create-board">+ Новая доска</button></div>
    ${cards ? `<div class="board-gallery-grid">${cards}</div>` : `<div class="board-gallery-empty"><span class="board-gallery-empty-mark" aria-hidden="true"></span><strong>Создайте первую доску</strong><p>Добавляйте стикеры, свободный текст и фигуры, затем соединяйте идеи линиями.</p><button type="button" class="text-btn primary" data-global="create-board">Создать доску</button></div>`}
  </div>`;
}

function getCalendarEvents() {
  return state.notes
    .filter((note) => note.reminder && !note.trashed && Number.isFinite(Date.parse(note.reminder)))
    .sort((a, b) => Date.parse(a.reminder) - Date.parse(b.reminder));
}

function calendarEventHTML(note) {
  const date = new Date(note.reminder);
  const title = String(note.title ?? '').trim() || noteAsText(note).split(/\r?\n/)[0]?.trim() || 'Без названия';
  const repeatLabel = note.repeat && note.repeat !== 'none'
    ? (REPEATS.find(([key]) => key === note.repeat)?.[1] || 'Повторяется')
    : '';
  const label = `${fmtTime(date)} — ${title}${repeatLabel ? `, ${repeatLabel}` : ''}`;
  return `<button type="button" class="calendar-event${date.getTime() < Date.now() ? ' is-past' : ''}" data-calendar-note="${esc(note.id)}" aria-label="${esc(label)}">
    <time class="calendar-event-time" datetime="${esc(date.toISOString())}">${esc(fmtTime(date))}</time>
    <span class="calendar-event-copy"><strong>${esc(title)}</strong>${repeatLabel ? `<span class="calendar-event-repeat">${icon('repeat', 13)}${esc(repeatLabel)}</span>` : ''}</span>
    <span class="calendar-event-arrow" aria-hidden="true">${icon('chevron', 16)}</span>
  </button>`;
}

function calendarHTML() {
  const selectedDate = new Date(ui.calendarDate);
  const today = new Date();
  const events = getCalendarEvents();
  const selectedKey = ymd(selectedDate);
  const monthTitle = calendarLabel(selectedDate, { month: 'long', year: 'numeric' });
  const monthEventCount = events.filter((event) => {
    const date = new Date(event.reminder);
    return date.getFullYear() === selectedDate.getFullYear() && date.getMonth() === selectedDate.getMonth();
  }).length;
  const eventCounts = new Map();
  for (const event of events) {
    const key = ymd(new Date(event.reminder));
    eventCounts.set(key, (eventCounts.get(key) || 0) + 1);
  }

  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const mondayOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1 - mondayOffset);
  const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = ymd(date);
    const eventCount = eventCounts.get(key) || 0;
    const selected = key === selectedKey;
    const outsideMonth = date.getMonth() !== selectedDate.getMonth();
    const isToday = sameCalendarDay(date, today);
    const dayLabel = date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const eventLabel = eventCount ? `, ${eventCount} ${plural(eventCount, 'напоминание', 'напоминания', 'напоминаний')}` : '';
    const markers = Array.from({ length: Math.min(eventCount, 3) }, () => '<i></i>').join('');
    return `<button type="button" class="calendar-day${selected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}${outsideMonth ? ' is-outside' : ''}" data-calendar-day="${key}" aria-pressed="${selected}" aria-label="${esc(dayLabel + eventLabel)}">
      <span class="calendar-day-number">${date.getDate()}</span>
      <span class="calendar-day-dots${eventCount ? '' : ' is-empty'}" aria-hidden="true">${markers}</span>
    </button>`;
  }).join('');

  const selectedEvents = events.filter((event) => ymd(new Date(event.reminder)) === selectedKey);
  const isToday = sameCalendarDay(selectedDate, today);
  const dateLabelOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  if (selectedDate.getFullYear() !== today.getFullYear()) dateLabelOptions.year = 'numeric';
  const selectedTitle = calendarLabel(selectedDate, dateLabelOptions);
  const selectedCount = `${selectedEvents.length} ${plural(selectedEvents.length, 'напоминание', 'напоминания', 'напоминаний')}`;
  const eventHours = selectedEvents.map((event) => new Date(event.reminder).getHours());
  const firstHour = selectedEvents.length ? Math.min(8, ...eventHours) : 8;
  const lastHour = selectedEvents.length ? Math.max(18, ...eventHours) : 18;
  const timelineRows = selectedEvents.length
    ? Array.from({ length: lastHour - firstHour + 1 }, (_, index) => {
      const hour = firstHour + index;
      const hourEvents = selectedEvents.filter((event) => new Date(event.reminder).getHours() === hour).map(calendarEventHTML).join('');
      return `<div class="calendar-hour-row${hourEvents ? ' has-events' : ''}${isToday && hour === today.getHours() ? ' is-now' : ''}" role="listitem">
        <span class="calendar-hour-label">${pad(hour)}:00</span>
        <div class="calendar-hour-track">${hourEvents}</div>
      </div>`;
    }).join('')
    : '';
  const todayControl = isToday
    ? '<span class="calendar-today-label">Сегодня</span>'
    : '<button type="button" class="calendar-today-button" data-calendar-action="today">Сегодня</button>';

  return `<section class="calendar-page" aria-label="Календарь напоминаний">
    <header class="calendar-page-head">
      <div class="calendar-page-copy">
        <span class="calendar-eyebrow">Планирование</span>
        <h1>Календарь</h1>
        <p>Напоминания из заметок — по датам и времени.</p>
      </div>
      <button type="button" class="calendar-add-button" data-calendar-action="add">${icon('bellPlus', 18)}<span>Новое напоминание</span></button>
    </header>
    <div class="calendar-layout">
      <section class="calendar-month-card" aria-label="Календарь месяца">
        <div class="calendar-month-head">
          <div class="calendar-month-title"><h2>${esc(monthTitle)}</h2><span>${monthEventCount} ${plural(monthEventCount, 'напоминание', 'напоминания', 'напоминаний')}</span></div>
          <div class="calendar-month-nav" aria-label="Переключение месяца">
            <button type="button" class="calendar-month-arrow" data-calendar-action="previous-month" aria-label="Предыдущий месяц">${icon('back', 17)}</button>
            <button type="button" class="calendar-month-arrow" data-calendar-action="next-month" aria-label="Следующий месяц">${icon('chevron', 17)}</button>
          </div>
        </div>
        <div class="calendar-weekdays" aria-hidden="true">${weekdayLabels.map((day) => `<span>${day}</span>`).join('')}</div>
        <div class="calendar-days" aria-label="Дни месяца">${calendarDays}</div>
        <footer class="calendar-month-footer">
          <span class="calendar-legend"><i aria-hidden="true"></i>Есть напоминание</span>
          ${todayControl}
        </footer>
      </section>
      <section class="calendar-day-card" aria-label="План на выбранный день">
        <header class="calendar-day-head">
          <div><span class="calendar-day-kicker">План на день</span><h2>${esc(selectedTitle)}</h2></div>
          <span class="calendar-event-count">${selectedCount}</span>
        </header>
        ${selectedEvents.length
          ? `<div class="calendar-timeline" role="list" aria-label="Расписание на ${esc(selectedTitle)}">${timelineRows}</div>`
          : `<div class="calendar-empty" role="status">
              <span class="calendar-empty-mark" aria-hidden="true">${icon('calendar', 24)}</span>
              <strong>На этот день пока нет планов</strong>
              <p>Добавьте напоминание — оно появится здесь и в заметках.</p>
              <button type="button" class="calendar-empty-action" data-calendar-action="add">${icon('add', 16)}Добавить напоминание</button>
            </div>`}
      </section>
    </div>
  </section>`;
}

function renderNotes() {
  clearTimeout(notesTimer);
  const c = $('#content');
  cardRO.disconnect();
  if (ui.section === 'calendar') {
    c.innerHTML = calendarHTML();
    ui.selected.clear();
    renderSelbar();
    return;
  }
  if (ui.section === 'board') {
    c.innerHTML = '';
    ui.selected.clear();
    renderSelbar();
    return;
  }
  if (ui.section === 'boards') {
    c.innerHTML = boardGalleryHTML();
    ui.selected.clear();
    renderSelbar();
    return;
  }
  const notes = visibleNotes();
  const view = state.settings.view;
  let html = '';
  if (ui.section === 'trash' && !ui.search) {
    html += `<div class="trash-bar">Заметки в корзине удаляются через ${TRASH_DAYS} дней.${notes.length ? '<button class="text-btn" data-global="empty-trash">Очистить корзину</button>' : ''}</div>`;
  }
  // Экран «Файлы» со всеми файлами
  if (ui.section === 'files' && !ui.search) {
    c.innerHTML = filesSectionHTML(allFiles(), 'Все файлы');
    ui.selected.clear(); renderSelbar();
    return;
  }
  if (ui.search && ui.section !== 'trash') {
    const q = ui.search.trim().toLowerCase();
    const hits = allFiles().filter((e) => e.f.name.toLowerCase().includes(q));
    if (hits.length) html += `<div class="section"><h2 class="sec-h">Файлы<span class="sec-count">${hits.length}</span></h2>${filesTableHTML(hits)}</div>`;
  }
  // Папки с тегом и найденные папки
  let tagFolders = [];
  if (ui.search && ui.section !== 'trash') {
    const q = ui.search.trim().toLowerCase();
    tagFolders = state.folders.filter((f) => f.name.toLowerCase().includes(q) || (f.labels || []).some((id) => (labelName(id) || '').toLowerCase().includes(q)));
  } else if (ui.section === 'label') tagFolders = state.folders.filter((f) => (f.labels || []).includes(ui.labelId));
  if (tagFolders.length) html += `<div class="section"><h2 class="sec-h">Папки<span class="sec-count">${tagFolders.length}</span></h2><div class="fgrid">${tagFolders.map(fcardHTML).join('')}</div></div>`;
  // Папки показываются отдельным разделом над заметками
  const showFolders = !ui.search && (ui.section === 'notes' || ui.section === 'folder');
  if (showFolders) {
    const subs = folderChildren(ui.section === 'folder' ? ui.folderId : null);
    html += `<div class="section"><h2 class="sec-h">${ui.section === 'folder' ? 'Вложенные папки' : 'Папки'}</h2><div class="fgrid">${subs.map(fcardHTML).join('')}`
      + `<button class="fcard fnew" data-global="new-folder" title="Новая папка">${icon('folderNew', 34)}<div class="fname">Новая папка</div></button></div></div>`;
    if (ui.section === 'folder') {
      html += filesSectionHTML(allFiles().filter((e) => e.folderId === ui.folderId && !e.note?.archived), 'Файлы', { folderId: ui.folderId, showWhere: false });
    } else {
      const recent = allFiles();
      if (recent.length) html += filesSectionHTML(recent, 'Недавно загруженные', { limit: 5, more: recent.length > 5 });
    }
  }
  if (!notes.length) html += showFolders || tagFolders.length ? `<div class="section"><h2 class="sec-h">Заметки</h2>${emptyHTML(true)}</div>` : emptyHTML();
  else {
    const usePins = !['trash', 'archive'].includes(ui.section) || ui.search;
    const pinned = usePins ? notes.filter((n) => n.pinned) : [];
    const others = usePins ? notes.filter((n) => !n.pinned) : notes;
    const grid = (arr) => `<div class="notes-grid ${view}">${arr.map(cardHTML).join('')}</div>`;
    const head = (t, k) => `<h2 class="sec-h">${t}<span class="sec-count">${k}</span></h2>`;
    if (pinned.length) {
      html += `<div class="section">${head('Закреплённые', pinned.length)}${grid(pinned)}</div>`;
      if (others.length) html += `<div class="section">${head(showFolders || tagFolders.length ? 'Заметки' : 'Другие', others.length)}${grid(others)}</div>`;
    } else html += `<div class="section">${showFolders || tagFolders.length ? head('Заметки', others.length) : ''}${grid(others)}</div>`;
  }
  c.innerHTML = html;
  c.querySelectorAll('.card').forEach((card) => { sizeCard(card); cardRO.observe(card); });
  // Убираем из выделения заметки, которых больше не видно
  const ids = new Set(notes.map((n) => n.id));
  for (const id of [...ui.selected]) if (!ids.has(id)) ui.selected.delete(id);
  renderSelbar();
}

function renderBoard() {
  const active = ui.section === 'board';
  const main = $('#main');
  const workspace = $('#boardWorkspace');
  main.hidden = active;
  workspace.hidden = !active;
  document.body.classList.toggle('board-open', active);
  if (!active) {
    window.BoardCanvas.setConnectMode(false);
    return;
  }
  const board = getBoard(ui.boardId);
  if (!board) { setSection('boards'); return; }
  const title = $('#boardTitle');
  if (document.activeElement !== title) title.value = board.title;
  $('#boardCanvas').setAttribute('aria-label', `Доска «${board.title}»`);
  window.BoardCanvas.render(board);
}

// ---------- Поле создания заметки ----------
const composer = { expanded: false, draft: null, editor: null };

function renderComposer() {
  const wrap = $('#composerWrap');
  const show = composerAllowed();
  wrap.style.display = show ? '' : 'none';
  if (!show) { if (composer.expanded) closeComposer(); return; }
  if (composer.expanded) return;
  const where = ui.section === 'folder' ? ` в «${esc(getFolder(ui.folderId)?.name || '')}»` : '';
  wrap.innerHTML = `<div class="composer collapsed">
      <div class="composer-placeholder">Новая заметка${where}...</div>
      <button class="icon-btn" data-act="list" title="Новый список (L)">${icon('cbOn')}</button>
      <button class="icon-btn" data-act="image" title="Новая заметка с картинкой">${icon('image')}</button>
    </div>`;
  wrap.firstElementChild.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    openComposer(act === 'list' ? 'list' : 'text', act === 'image');
  });
}

function openComposer(type = 'text', withImage = false) {
  if (composer.expanded) { composer.editor.focus(); return; }
  const partial = { type };
  if (ui.section === 'label') partial.labels = [ui.labelId];
  if (ui.section === 'folder') partial.folderId = ui.folderId;
  if (ui.section === 'reminders') {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0);
    partial.reminder = d.toISOString();
  }
  composer.draft = newNote(partial);
  composer.expanded = true;
  const wrap = $('#composerWrap');
  wrap.innerHTML = '';
  composer.editor = createEditor(composer.draft, { mode: 'composer', onClose: closeComposer });
  wrap.appendChild(composer.editor.el);
  composer.editor.focus();
  if (withImage) composer.editor.pickImage();
}

function closeComposer() {
  if (!composer.expanded) return;
  const d = composer.draft;
  composer.expanded = false; composer.draft = null; composer.editor = null;
  closePopover();
  let added = false;
  if (!d.discarded && !isEmpty(d)) {
    d.order = nextOrder();
    d.createdAt = d.updatedAt = Date.now();
    state.notes.push(d);
    save();
    added = true;
    if (d.archived) showSnack('Заметка перенесена в архив', makeUndo(() => { state.notes = state.notes.filter((n) => n !== d); }));
  }
  renderComposer();
  if (added) renderNotes();
}

// ---------- Редактор заметки (используется и в поле создания, и в окне) ----------
function createEditor(note, { mode, onClose }) {
  const isModal = mode === 'modal';
  const ro = !!note.trashed;
  const root = document.createElement('div');
  root.className = `editor ${mode}`;
  applyColorEl(root, note.color);
  root.innerHTML = `
    <div class="ed-scroll">
      <div class="ed-images"></div>
      <div class="ed-head">
        <textarea class="ed-title" rows="1" placeholder="Введите заголовок" maxlength="1000"></textarea>
        <button class="icon-btn pin-btn"></button>
      </div>
      <div class="ed-body"></div>
      <div class="ed-files"></div>
      <div class="ed-chips"></div>
      <div class="ed-meta"></div>
    </div>
    <div class="ed-toolbar">
      <div class="tb-left"></div>
      <button class="text-btn ed-close">Закрыть</button>
    </div>`;
  const titleEl = $('.ed-title', root), bodyEl = $('.ed-body', root), imagesEl = $('.ed-images', root);
  const filesEl = $('.ed-files', root);
  const chipsEl = $('.ed-chips', root), metaEl = $('.ed-meta', root), tbLeft = $('.tb-left', root), pinBtn = $('.pin-btn', root);

  const changed = () => { touch(note); if (isModal) { save(); scheduleNotesRender(); } paintMeta(); };

  titleEl.value = note.title;
  titleEl.readOnly = ro;
  titleEl.addEventListener('input', () => { note.title = titleEl.value.replace(/\n/g, ' '); changed(); });
  titleEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); focusBody(); } });

  let list = null, textEl = null;
  function paintBody() {
    bodyEl.innerHTML = ''; list = null; textEl = null;
    if (note.type === 'list') {
      list = listEditor(note, changed, ro);
      bodyEl.appendChild(list.el);
      list.paint();
    } else {
      textEl = document.createElement('textarea');
      textEl.className = 'ed-text';
      textEl.placeholder = 'Заметка...';
      textEl.value = note.content;
      textEl.readOnly = ro;
      textEl.addEventListener('input', () => { note.content = textEl.value; changed(); });
      bodyEl.appendChild(textEl);
    }
  }
  function focusBody() {
    if (textEl) { textEl.focus(); const l = textEl.value.length; textEl.setSelectionRange(l, l); } else list?.focusNew();
  }

  function paintImages() {
    imagesEl.className = 'ed-images n' + Math.min(note.images.length, 3);
    imagesEl.innerHTML = note.images.map((src, i) => `<div class="img-wrap"><img src="${src}" alt="">${ro ? '' : `<button class="icon-btn small img-del" data-i="${i}" title="Удалить картинку">${icon('delete', 18)}</button>`}</div>`).join('');
  }
  imagesEl.addEventListener('click', (e) => {
    const del = e.target.closest('.img-del');
    if (del) { note.images.splice(+del.dataset.i, 1); paintImages(); changed(); return; }
    const img = e.target.closest('img');
    if (img) openImageViewer(img.src);
  });

  function paintPin() {
    pinBtn.style.display = ro ? 'none' : '';
    pinBtn.title = note.pinned ? 'Открепить' : 'Закрепить';
    pinBtn.innerHTML = icon(note.pinned ? 'pinOn' : 'pin');
  }
  pinBtn.addEventListener('click', () => {
    note.pinned = !note.pinned;
    if (note.pinned && note.archived) note.archived = false;
    paintPin(); paintToolbar(); changed();
  });

  function paintChips() { chipsEl.innerHTML = chipsHTML(note, !ro, true); }
  chipsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || ro) return;
    const act = b.dataset.act;
    if (act === 'rm-reminder') { note.reminder = null; note.reminderFired = false; note.repeat = 'none'; }
    else if (act === 'rm-label') note.labels = note.labels.filter((x) => x !== b.dataset.label);
    else if (act === 'rm-folder') note.folderId = null;
    else if (act === 'goto-folder') { folderPopover(b, note.folderId, (id) => { note.folderId = id; paintChips(); changed(); }); return; }
    else if (act === 'open-reminder') { reminderPopover(b, note, () => { paintChips(); changed(); }); return; }
    else return;
    paintChips(); changed();
  });

  function paintMeta() {
    if (!isModal) return;
    metaEl.textContent = fmtEdited(note.updatedAt);
    metaEl.title = 'Создано: ' + new Date(note.createdAt).toLocaleString('ru-RU');
  }

  function paintToolbar() {
    tbLeft.innerHTML = ro
      ? tbBtn('destroy', 'deleteForever', 'Удалить навсегда') + tbBtn('restore', 'restore', 'Восстановить')
      : tbBtn('remind', 'bellPlus', 'Напоминание') + tbBtn('color', 'palette', 'Цвет фона') + tbBtn('image', 'image', 'Добавить картинку') + tbBtn('attach', 'attach', 'Прикрепить файл')
        + tbBtn('archive', note.archived ? 'unarchive' : 'archive', note.archived ? 'Вернуть из архива' : 'Архивировать') + tbBtn('more', 'more', 'Ещё');
  }
  tbLeft.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (popover && popover.anchor === b) { closePopover(); return; }
    switch (b.dataset.act) {
      case 'remind': reminderPopover(b, note, () => { paintChips(); changed(); }); break;
      case 'color': colorPopover(b, note.color, (c) => { note.color = c; applyColorEl(root, c); changed(); }); break;
      case 'image': pickImages((imgs) => { note.images.push(...imgs); paintImages(); changed(); }); break;
      case 'attach': window.api.pickFiles().then(addAttachments); break;
      case 'archive':
        if (!isModal) { note.archived = true; note.pinned = false; onClose(); }
        else { onClose(); archiveNotes([note], !note.archived); }
        break;
      case 'more': {
        const items = [
          ['Удалить заметку', () => { if (!isModal) { note.discarded = true; onClose(); } else { onClose(); trashNotes([note]); } }],
          ['Переместить в папку', () => folderPopover(b, note.folderId, (id) => { note.folderId = id; paintChips(); changed(); })],
          [note.labels.length ? 'Изменить теги' : 'Добавить тег', () => labelPopover(b, singleLabelOps(note, () => { paintChips(); changed(); }))],
        ];
        if (isModal) items.push(['Создать копию', () => { onClose(); duplicateNote(note); }]);
        items.push([note.type === 'list' ? 'Скрыть флажки' : 'Показать флажки', () => { toggleListMode(note); paintBody(); changed(); focusBody(); }]);
        items.push(['Копировать текст', () => copyNoteText(note)]);
        menuPopover(b, items);
        break;
      }
      case 'destroy': onClose(); destroyNotes([note]); break;
      case 'restore': onClose(); restoreNotes([note]); break;
    }
  });
  $('.ed-close', root).addEventListener('click', () => onClose());

  // Прикреплённые файлы
  function paintFiles() {
    const files = note.files || [];
    filesEl.innerHTML = files.map((f) => `<div class="efile" data-file="${f.id}" title="Открыть «${esc(f.name)}»">${fileBadge(f.name)}`
      + `<div class="efile-name"><span>${esc(f.name)}</span><small>${fmtSize(f.size)}</small></div>`
      + `<button class="icon-btn small" data-fa="show" title="Показать в папке">${icon('folderOpen', 18)}</button>`
      + `<button class="icon-btn small" data-fa="save" title="Сохранить как…">${icon('upload', 18)}</button>`
      + (ro ? '' : `<button class="icon-btn small" data-fa="remove" title="Открепить файл">${icon('close', 18)}</button>`) + '</div>').join('');
  }
  function addAttachments(metas) {
    if (!metas || !metas.length) return;
    note.files = [...(note.files || []), ...metas];
    paintFiles(); changed();
  }
  filesEl.addEventListener('click', (e) => {
    const row = e.target.closest('.efile');
    if (!row) return;
    const f = (note.files || []).find((x) => x.id === row.dataset.file);
    if (!f) return;
    const a = e.target.closest('[data-fa]')?.dataset.fa;
    if (a === 'show') showFileMeta(f);
    else if (a === 'save') saveFileMeta(f);
    else if (a === 'remove') { note.files = note.files.filter((x) => x !== f); paintFiles(); changed(); }
    else openFileMeta(f);
  });

  // Вставка и перетаскивание: картинки — в заметку, остальное — как файлы
  const addDropped = async (files) => {
    const imgs = files.filter((f) => f.type.startsWith('image/'));
    const other = files.filter((f) => !f.type.startsWith('image/'));
    if (imgs.length) {
      const urls = (await Promise.all(imgs.map((f) => fileToDataUrl(f)))).filter(Boolean);
      if (urls.length) { note.images.push(...urls); paintImages(); changed(); }
    }
    if (other.length) addAttachments(await importFileObjects(other));
  };
  root.addEventListener('paste', (e) => {
    if (ro) return;
    const files = [...(e.clipboardData?.files || [])];
    if (!files.length) return;
    e.preventDefault();
    addDropped(files);
  });
  root.addEventListener('dragover', (e) => {
    if (ro || !e.dataTransfer.types.includes('Files')) return;
    e.preventDefault(); e.stopPropagation(); root.classList.add('drop');
  });
  root.addEventListener('dragleave', (e) => { if (!root.contains(e.relatedTarget)) root.classList.remove('drop'); });
  root.addEventListener('drop', (e) => {
    root.classList.remove('drop');
    const files = [...e.dataTransfer.files];
    if (!files.length || ro) return;
    e.preventDefault(); e.stopPropagation();
    addDropped(files);
  });

  paintImages(); paintPin(); paintBody(); paintFiles(); paintChips(); paintMeta(); paintToolbar();
  return {
    el: root,
    focus: () => (note.type === 'text' && !isModal) || note.title || note.type === 'list' ? focusBody() : titleEl.focus(),
    pickImage: () => $('[data-act="image"]', tbLeft)?.click(),
  };
}

// ---------- Редактор списка с флажками ----------
function listEditor(note, changed, ro) {
  const el = document.createElement('div');
  el.className = 'list-ed';
  let showDone = true;
  let dragId = null;
  const unchecked = () => note.items.filter((i) => !i.done);

  function paint(focusId = null, caret = null) {
    el.innerHTML = '';
    const un = unchecked(), dn = note.items.filter((i) => i.done);
    un.forEach((i) => el.appendChild(row(i)));
    if (!ro) el.appendChild(addRow());
    if (dn.length) {
      if (un.length || !ro) el.insertAdjacentHTML('beforeend', '<div class="done-sep"></div>');
      const hdr = document.createElement('button');
      hdr.className = 'done-hdr';
      hdr.innerHTML = `${icon(showDone ? 'expandLess' : 'expandMore', 20)}<span>${dn.length} ${plural(dn.length, 'отмеченный пункт', 'отмеченных пункта', 'отмеченных пунктов')}</span>`;
      hdr.addEventListener('click', () => { showDone = !showDone; paint(); });
      el.appendChild(hdr);
      if (showDone) dn.forEach((i) => el.appendChild(row(i)));
    }
    if (focusId) {
      const ta = el.querySelector(`.li[data-id="${focusId}"] textarea`);
      if (ta) { ta.focus(); const p = caret ?? ta.value.length; ta.setSelectionRange(p, p); }
    }
  }

  function moveFocus(from, dir) {
    const fields = [...el.querySelectorAll('textarea, .add-input')];
    const target = fields[fields.indexOf(from) + dir];
    if (target) { target.focus(); return true; }
    return false;
  }

  function row(item) {
    const r = document.createElement('div');
    r.className = 'li' + (item.done ? ' done' : '');
    r.dataset.id = item.id;
    r.innerHTML = `<span class="handle" title="Перетащите, чтобы изменить порядок">${item.done || ro ? '' : icon('drag', 18)}</span>`
      + `<button class="icon-btn small cb" title="${item.done ? 'Снять отметку' : 'Отметить'}">${icon(item.done ? 'cbOn' : 'cbOff', 20)}</button>`
      + '<textarea rows="1" class="li-text" placeholder="Пункт списка"></textarea>'
      + (ro ? '' : `<button class="icon-btn small li-del" title="Удалить пункт">${icon('close', 18)}</button>`);
    const ta = $('textarea', r);
    ta.value = item.text;
    ta.readOnly = ro;
    ta.addEventListener('input', () => { item.text = ta.value.replace(/\n/g, ' '); changed(); });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (item.done || ro) return;
        const after = item.text.slice(ta.selectionEnd);
        item.text = item.text.slice(0, ta.selectionStart);
        const ni = { id: uid(), text: after, done: false };
        note.items.splice(note.items.indexOf(item) + 1, 0, ni);
        changed(); paint(ni.id, 0);
      } else if (e.key === 'Backspace' && ta.selectionStart === 0 && ta.selectionEnd === 0 && !item.done && !ro) {
        const un = unchecked();
        const idx = un.indexOf(item);
        if (idx > 0) {
          e.preventDefault();
          const prev = un[idx - 1];
          const p = prev.text.length;
          prev.text += item.text;
          note.items.splice(note.items.indexOf(item), 1);
          changed(); paint(prev.id, p);
        } else if (!item.text) {
          e.preventDefault();
          note.items.splice(note.items.indexOf(item), 1);
          changed(); paint(un[1]?.id ?? null);
        }
      } else if (e.key === 'ArrowUp' && ta.selectionStart === 0) {
        if (moveFocus(ta, -1)) e.preventDefault();
      } else if (e.key === 'ArrowDown' && ta.selectionEnd === ta.value.length) {
        if (moveFocus(ta, 1)) e.preventDefault();
      }
    });
    if (ro) { $('.cb', r).disabled = true; return r; }

    $('.cb', r).addEventListener('click', () => { item.done = !item.done; changed(); paint(); });
    $('.li-del', r).addEventListener('click', () => { note.items.splice(note.items.indexOf(item), 1); changed(); paint(); });

    if (!item.done) {
      const handle = $('.handle', r);
      handle.addEventListener('mousedown', () => { r.draggable = true; });
      handle.addEventListener('mouseup', () => { r.draggable = false; });
      r.addEventListener('dragstart', (e) => {
        dragId = item.id; r.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/x-item', item.id);
        e.stopPropagation();
      });
      r.addEventListener('dragend', () => {
        r.draggable = false; dragId = null; r.classList.remove('dragging');
        el.querySelectorAll('.over-top, .over-bottom').forEach((x) => x.classList.remove('over-top', 'over-bottom'));
      });
      r.addEventListener('dragover', (e) => {
        if (!dragId || dragId === item.id) return;
        e.preventDefault(); e.stopPropagation();
        const rect = r.getBoundingClientRect();
        const top = e.clientY < rect.top + rect.height / 2;
        r.classList.toggle('over-top', top);
        r.classList.toggle('over-bottom', !top);
      });
      r.addEventListener('dragleave', () => r.classList.remove('over-top', 'over-bottom'));
      r.addEventListener('drop', (e) => {
        if (!dragId) return;
        e.preventDefault(); e.stopPropagation();
        const top = r.classList.contains('over-top');
        const moving = note.items.find((i) => i.id === dragId);
        dragId = null;
        if (!moving) return;
        note.items.splice(note.items.indexOf(moving), 1);
        let idx = note.items.indexOf(item);
        if (!top) idx++;
        note.items.splice(idx, 0, moving);
        changed(); paint();
      });
    }
    return r;
  }

  function addRow() {
    const r = document.createElement('div');
    r.className = 'li add';
    r.innerHTML = `<span class="handle"></span><span class="add-plus">${icon('add', 20)}</span><input class="add-input" placeholder="Пункт списка">`;
    const inp = $('input', r);
    inp.addEventListener('input', () => {
      const v = inp.value;
      if (!v) return;
      const un = unchecked();
      const last = un[un.length - 1];
      const idx = last ? note.items.indexOf(last) + 1 : 0;
      const ni = { id: uid(), text: v, done: false };
      note.items.splice(idx, 0, ni);
      changed(); paint(ni.id);
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' && moveFocus(inp, -1)) e.preventDefault();
      if (e.key === 'Enter') e.preventDefault();
    });
    return r;
  }

  return { el, paint, focusNew: () => $('.add-input', el)?.focus() };
}

function toggleListMode(n) {
  if (n.type === 'text') {
    n.items = n.content.split('\n').filter((s) => s.trim()).map((t) => ({ id: uid(), text: t.replace(/^\s*[-•*]\s+/, ''), done: false }));
    n.content = '';
    n.type = 'list';
  } else {
    n.content = n.items.map((i) => i.text).join('\n');
    n.items = [];
    n.type = 'text';
  }
  touch(n);
}

// ---------- Окно редактирования заметки ----------
let modal = null;
function openNoteModal(id) {
  const note = getNote(id);
  if (!note) return;
  closePopover();
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const editor = createEditor(note, { mode: 'modal', onClose: closeModal });
  overlay.appendChild(editor.el);
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) closeModal(); });
  $('#modalRoot').appendChild(overlay);
  modal = { id, overlay };
  document.querySelector(`.card[data-id="${id}"]`)?.classList.add('editing');
  editor.focus();
}
function closeModal() {
  if (!modal) return;
  const { id, overlay } = modal;
  modal = null;
  closePopover();
  overlay.remove();
  const n = getNote(id);
  if (n && !n.trashed && isEmpty(n)) {
    state.notes = state.notes.filter((x) => x !== n);
    save();
    showSnack('Пустая заметка удалена');
  }
  renderNotes();
}

// ---------- Всплывающие меню ----------
let popover = null;
function openPopover(anchor, content) {
  closePopover();
  const p = document.createElement('div');
  p.className = 'popover';
  p.appendChild(content);
  $('#popoverRoot').appendChild(p);
  const card = anchor.closest('.card');
  popover = { el: p, anchor, cardId: card?.dataset.id || null, reposition };
  card?.classList.add('active');
  function reposition() {
    const r = anchor.getBoundingClientRect();
    const pw = p.offsetWidth, ph = p.offsetHeight;
    let left = r.left, top = r.bottom + 4;
    if (left + pw > innerWidth - 8) left = innerWidth - pw - 8;
    if (top + ph > innerHeight - 8) top = Math.max(8, r.top - ph - 4);
    p.style.left = Math.max(8, left) + 'px';
    p.style.top = top + 'px';
  }
  reposition();
  return p;
}
function closePopover() {
  if (!popover) return;
  const { el, cardId } = popover;
  popover = null;
  el.remove();
  if (cardId) document.querySelector(`.card[data-id="${cardId}"]`)?.classList.remove('active');
}

function menuPopover(anchor, items) {
  const c = document.createElement('div');
  for (const [label, fn, opt] of items) {
    const b = document.createElement('button');
    b.className = 'menu-item';
    b.innerHTML = (opt && 'checked' in opt ? `<span class="mcheck">${opt.checked ? icon('check', 18) : ''}</span>` : '') + `<span>${esc(label)}</span>`;
    b.addEventListener('click', () => { closePopover(); fn(); });
    c.appendChild(b);
  }
  openPopover(anchor, c);
}

function colorPopover(anchor, current, onPick) {
  const c = document.createElement('div');
  c.className = 'color-pop';
  let cur = current;
  function paint() {
    const custom = state.settings.customColors || [];
    c.innerHTML = '<div class="pop-title">Цвет заметки</div><div class="color-grid">'
      + COLORS.map(([id, name]) => `<button class="swatch${id === cur ? ' selected' : ''}" data-color="${id}" data-pick="${id}" title="${name}">${id === 'default' ? icon('noColor', 18) : ''}</button>`).join('')
      + '</div><div class="pop-title">Свой цвет</div><div class="color-grid">'
      + custom.map((h) => `<button class="swatch${h === cur ? ' selected' : ''}" data-color="custom" style="--nc-raw:${h}" data-pick="${h}" title="${h}"></button>`).join('')
      + `<label class="swatch swatch-add" title="Выбрать любой цвет">${icon('add', 18)}<input type="color" value="${isHex(cur) ? cur : '#7c5cff'}"></label></div>`;
  }
  c.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]');
    if (!b) return;
    cur = b.dataset.pick;
    c.querySelectorAll('.swatch').forEach((x) => x.classList.toggle('selected', x === b));
    onPick(cur);
  });
  c.addEventListener('input', (e) => { if (e.target.type === 'color') { cur = e.target.value; onPick(cur); } });
  c.addEventListener('change', (e) => {
    if (e.target.type !== 'color') return;
    const h = e.target.value.toLowerCase();
    state.settings.customColors = [h, ...(state.settings.customColors || []).filter((x) => x !== h)].slice(0, 11);
    cur = h; save(); paint(); popover?.reposition();
    onPick(h);
  });
  paint();
  openPopover(anchor, c);
}

// ops: { isChecked(id) -> bool|'some', toggle(id, on) }
function singleLabelOps(note, after) {
  return {
    isChecked: (id) => note.labels.includes(id),
    toggle: (id, on) => { note.labels = on ? [...new Set([...note.labels, id])] : note.labels.filter((x) => x !== id); after(); },
  };
}
function labelPopover(anchor, ops) {
  const c = document.createElement('div');
  c.className = 'lbl-pop';
  c.innerHTML = `<div class="pop-title">Теги</div>
    <div class="lbl-search"><input type="text" placeholder="Найти или создать тег" maxlength="50"><span class="muted">${icon('search', 18)}</span></div>
    <div class="lbl-list"></div>`;
  const inp = $('input', c), listEl = $('.lbl-list', c);
  function create() {
    const name = inp.value.trim();
    if (!name) return;
    let l = state.labels.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (!l) { l = { id: uid(), name }; state.labels.push(l); }
    ops.toggle(l.id, true);
    inp.value = '';
    save(); renderSidebar(); paint();
  }
  function paint() {
    const q = inp.value.trim().toLowerCase();
    const list = sortedLabels().filter((l) => l.name.toLowerCase().includes(q));
    const exact = state.labels.some((l) => l.name.toLowerCase() === q);
    listEl.innerHTML = list.map((l) => {
      const st = ops.isChecked(l.id);
      return `<label class="lbl-opt"><input type="checkbox" data-id="${l.id}" ${st === true ? 'checked' : ''} ${st === 'some' ? 'data-some="1"' : ''}><span>${esc(l.name)}</span></label>`;
    }).join('')
      + (q && !exact ? `<button class="menu-item lbl-create">${icon('add', 18)}<span>Создать тег «${esc(inp.value.trim())}»</span></button>` : '');
    listEl.querySelectorAll('[data-some]').forEach((x) => { x.indeterminate = true; });
    popover?.reposition();
  }
  listEl.addEventListener('change', (e) => {
    const cb = e.target.closest('input[type=checkbox]');
    if (!cb) return;
    ops.toggle(cb.dataset.id, cb.checked);
    save();
  });
  listEl.addEventListener('click', (e) => { if (e.target.closest('.lbl-create')) create(); });
  inp.addEventListener('input', paint);
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); create(); } });
  paint();
  openPopover(anchor, c);
  inp.focus();
}

function reminderPopover(anchor, note, onChange) {
  const c = document.createElement('div');
  c.className = 'rem-pop';
  const now = new Date();
  const at = (days, hour) => { const x = new Date(now); x.setDate(x.getDate() + days); x.setHours(hour, 0, 0, 0); return x; };
  const opts = [];
  if (at(0, 20) > now) opts.push(['Сегодня', at(0, 20), '']);
  opts.push(['Завтра', at(1, 8), '']);
  const toMonday = ((8 - now.getDay()) % 7) || 7;
  opts.push(['На следующей неделе', at(toMonday, 8), 'пн, ']);

  const set = (d, repeat) => {
    note.reminder = d.toISOString();
    note.reminderFired = false;
    note.repeat = repeat;
    onChange();
    closePopover();
  };
  function paintMain() {
    c.innerHTML = '<div class="pop-title">Напоминание:</div>'
      + opts.map(([l, d, pre], i) => `<button class="menu-item" data-i="${i}"><span>${l}</span><span class="muted">${pre}${fmtTime(d)}</span></button>`).join('')
      + `<button class="menu-item" data-a="custom">${icon('clock', 18)}<span>Выбрать дату и время</span></button>`
      + (note.reminder ? `<button class="menu-item" data-a="remove">${icon('delete', 18)}<span>Удалить напоминание</span></button>` : '');
    popover?.reposition();
  }
  function paintCustom() {
    const base = note.reminder ? new Date(note.reminder) : at(1, 8);
    c.innerHTML = `<div class="pop-title"><button class="icon-btn small" data-a="back" title="Назад">${icon('back', 18)}</button>Выберите дату и время</div>
      <label class="field"><input type="date" class="inp" id="remDate" value="${ymd(base)}"></label>
      <label class="field"><input type="time" class="inp" id="remTime" value="${fmtTime(base)}"></label>
      <label class="field"><select class="inp" id="remRepeat">${REPEATS.map(([k, l]) => `<option value="${k}"${k === (note.repeat || 'none') ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      <div class="pop-actions"><button class="text-btn" data-a="save">Сохранить</button></div>`;
    popover?.reposition();
  }
  c.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i], [data-a]');
    if (!b) return;
    if (b.dataset.i !== undefined) { set(opts[+b.dataset.i][1], 'none'); return; }
    switch (b.dataset.a) {
      case 'custom': paintCustom(); break;
      case 'back': paintMain(); break;
      case 'remove':
        note.reminder = null; note.reminderFired = false; note.repeat = 'none';
        onChange(); closePopover(); break;
      case 'save': {
        const d = $('#remDate', c).value, t = $('#remTime', c).value || '08:00';
        if (!d) return;
        const dt = new Date(`${d}T${t}`);
        if (isNaN(dt)) return;
        set(dt, $('#remRepeat', c).value);
      }
    }
  });
  paintMain();
  openPopover(anchor, c);
}

// ---------- Диалоги ----------
const dialogs = [];
function openDialog(el, { onClose } = {}) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.appendChild(el);
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(); });
  $('#modalRoot').appendChild(ov);
  const d = { close };
  dialogs.push(d);
  function close() {
    const i = dialogs.indexOf(d);
    if (i < 0) return;
    dialogs.splice(i, 1);
    ov.remove();
    onClose?.();
  }
  return close;
}
function confirmDialog(text, okText = 'OK') {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'dialog';
    el.innerHTML = `<div class="dlg-text">${esc(text)}</div><div class="dlg-actions"><button class="text-btn" data-r="0">Отмена</button><button class="text-btn primary" data-r="1">${esc(okText)}</button></div>`;
    let result = false;
    const close = openDialog(el, { onClose: () => resolve(result) });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (!b) return;
      result = b.dataset.r === '1';
      close();
    });
    $('.primary', el).focus();
  });
}
function openImageViewer(src) {
  const img = document.createElement('img');
  img.className = 'viewer';
  img.src = src;
  const close = openDialog(img);
  img.addEventListener('click', close);
}

// ---------- Файлы ----------
const FILE_KINDS = [
  [/^pdf$/, '#e5484d'], [/^(docx?|odt|rtf)$/, '#3b82f6'], [/^(xlsx?|ods|csv)$/, '#22a06b'], [/^(pptx?|odp|key)$/, '#f97316'],
  [/^(zip|rar|7z|tar|gz)$/, '#8b5cf6'], [/^(png|jpe?g|gif|webp|bmp|svg|heic|ico)$/, '#14b8a6'], [/^(mp3|wav|flac|ogg|m4a)$/, '#ec4899'],
  [/^(mp4|mov|avi|mkv|webm)$/, '#f43f5e'], [/^(txt|md|log)$/, '#94a3b8'],
  [/^(js|ts|py|java|cpp|c|h|cs|html|css|json|xml|sql|go|rs|kt|php|ipynb|pas|exe)$/, '#eab308'],
];
const fileExt = (name) => { const m = /\.([^.\\/]+)$/.exec(name || ''); return m ? m[1].toLowerCase() : ''; };
function fileBadge(name, size = '') {
  const ext = fileExt(name);
  const color = (FILE_KINDS.find(([r]) => r.test(ext)) || [0, '#64748b'])[1];
  return `<span class="fbadge ${size}" style="--fc:${color}"><span>${esc((ext || 'файл').slice(0, 4).toUpperCase())}</span></span>`;
}
function fmtSize(b) {
  b = +b || 0;
  if (b < 1024) return `${b} Б`;
  if (b < 1048576) return `${(b / 1024).toFixed(b < 10240 ? 1 : 0)} КБ`;
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)} МБ`;
  return `${(b / 1073741824).toFixed(2)} ГБ`;
}
// Все файлы: загруженные прямо в папки и прикреплённые к заметкам
function allFiles() {
  const out = state.files.map((f) => ({ f, note: null, folderId: f.folderId || null }));
  for (const n of state.notes) {
    if (n.trashed) continue;
    for (const f of n.files || []) out.push({ f, note: n, folderId: n.folderId || null });
  }
  return out.sort((a, b) => (b.f.addedAt || 0) - (a.f.addedAt || 0));
}
const findFile = (id) => allFiles().find((e) => e.f.id === id);
const referencedFiles = () => [...state.files, ...state.notes.flatMap((n) => n.files || [])].map((f) => f.stored).filter(Boolean);

// Копирует файлы (из проводника, буфера или окна выбора) в хранилище программы
async function importFileObjects(list) {
  const paths = [], blobs = [];
  for (const f of list) {
    const p = window.api.pathForFile ? window.api.pathForFile(f) : '';
    if (p) paths.push(p); else blobs.push(f);
  }
  const out = [];
  if (paths.length) out.push(...(await window.api.addFilePaths(paths)));
  for (const f of blobs) {
    if (f.size > 300 * 1048576) { showSnack(`Файл «${f.name}» слишком большой для вставки — перетащите его из проводника`); continue; }
    out.push(await window.api.addFileData(f.name || 'Файл', f.type, await f.arrayBuffer()));
  }
  return out.filter(Boolean);
}
const filesWord = (k) => `${k} ${plural(k, 'файл', 'файла', 'файлов')}`;
function addLooseFiles(metas, folderId) {
  if (!metas.length) return;
  metas.forEach((m) => { m.folderId = folderId || null; state.files.push(m); });
  save(); render();
  const f = folderId && getFolder(folderId);
  showSnack(`Добавлено: ${filesWord(metas.length)}${f ? ` в «${f.name}»` : ''}`, makeUndo(() => { state.files = state.files.filter((x) => !metas.includes(x)); }));
}
async function uploadToFolder(folderId) {
  addLooseFiles(await window.api.pickFiles(), folderId);
}
async function openFileMeta(f) {
  const ok = await window.api.openFile(f);
  if (ok === false) showSnack('Не удалось открыть файл — возможно, он был удалён');
}
async function showFileMeta(f) {
  const ok = await window.api.showFile(f);
  if (ok === false) showSnack('Файл не найден');
}
async function saveFileMeta(f) {
  const ok = await window.api.saveFileAs(f);
  if (ok) showSnack('Файл сохранён');
  else if (ok === false) showSnack('Файл не найден');
}
function removeFileEntry(e) {
  withUndo(`Файл «${e.f.name}» удалён`, () => {
    if (e.note) { e.note.files = e.note.files.filter((x) => x.id !== e.f.id); touch(e.note); }
    else state.files = state.files.filter((x) => x.id !== e.f.id);
  });
}
function fileMenu(anchor, id) {
  const e = findFile(id);
  if (!e) return;
  const items = [
    ['Открыть', () => openFileMeta(e.f)],
    ['Показать в папке', () => showFileMeta(e.f)],
    ['Сохранить как…', () => saveFileMeta(e.f)],
  ];
  if (e.note) items.push(['Открыть заметку', () => openNoteModal(e.note.id)]);
  else items.push(['Переместить в папку', () => folderPopover(anchor, e.f.folderId, (fid) => {
    const f = fid && getFolder(fid);
    withUndo(f ? `Файл перемещён в «${f.name}»` : 'Файл убран из папки', () => { const x = state.files.find((y) => y.id === id); if (x) x.folderId = fid; });
  })]);
  items.push(['Удалить', () => removeFileEntry(e)]);
  menuPopover(anchor, items);
}
function filesTableHTML(entries, { showWhere = true } = {}) {
  const rows = entries.map(({ f, note }) => {
    let where = '';
    if (showWhere) {
      if (note) where = `<button class="flink" data-act="open-note" data-note="${note.id}">${icon('bulb', 14)}<span>${esc(note.title || noteAsText(note).split('\n')[0] || 'Заметка')}</span></button>`;
      else if (f.folderId && getFolder(f.folderId)) where = `<button class="flink" data-act="goto-folder" data-folder="${f.folderId}">${icon('folder', 14)}<span>${esc(getFolder(f.folderId).name)}</span></button>`;
      else where = '<span class="muted">—</span>';
    } else where = note ? `<button class="flink" data-act="open-note" data-note="${note.id}">${icon('bulb', 14)}<span>${esc(note.title || 'Заметка')}</span></button>` : '<span class="muted">В папке</span>';
    return `<div class="frow" data-file="${f.id}" title="Открыть «${esc(f.name)}»">
      ${fileBadge(f.name)}
      <div class="frow-name"><span class="fn">${esc(f.name)}</span><span class="fmeta">${fmtSize(f.size)}</span></div>
      <div class="frow-where">${where}</div>
      <div class="frow-date">${f.addedAt ? esc(fmtDay(new Date(f.addedAt))) : ''}</div>
      <div class="frow-acts"><button class="icon-btn small" data-act="show-file" title="Показать в папке">${icon('folderOpen', 18)}</button><button class="icon-btn small" data-act="file-menu" title="Ещё">${icon('more', 18)}</button></div>
    </div>`;
  }).join('');
  return `<div class="ftable"><div class="fhead"><span></span><span>Файл</span><span>${showWhere ? 'Где' : 'Источник'}</span><span>Добавлен</span><span></span></div>${rows}</div>`;
}
function filesSectionHTML(entries, title, { folderId = null, showWhere = true, limit = 0, more = false } = {}) {
  const shown = limit ? entries.slice(0, limit) : entries;
  return `<div class="section files-section" data-upload-folder="${folderId || ''}">
    <h2 class="sec-h">${title}${entries.length ? `<span class="sec-count">${entries.length}</span>` : ''}
      <span class="sec-actions">${more ? `<button class="text-btn small" data-global="all-files">Все файлы</button>` : ''}<button class="text-btn small upload-btn" data-global="upload" data-folder="${folderId || ''}">${icon('upload', 18)}Загрузить</button></span></h2>
    ${shown.length ? filesTableHTML(shown, { showWhere }) : `<div class="file-drop-hint" data-global="upload" data-folder="${folderId || ''}">${icon('upload', 28)}<span>Перетащите файлы сюда или нажмите, чтобы выбрать</span></div>`}
  </div>`;
}

// ---------- Папки и теги: создание, переименование, удаление ----------
function uniqueFolderName(base, parentId) {
  const names = new Set(folderChildren(parentId).map((f) => f.name.toLowerCase()));
  if (!names.has(base.toLowerCase())) return base;
  let i = 2;
  while (names.has(`${base} ${i}`.toLowerCase())) i++;
  return `${base} ${i}`;
}
function ensurePanel(tab) {
  state.settings.panelCollapsed = false;
  state.settings.panelTab = tab;
  if (tab === 'folders') {
    // Раскрываем путь, чтобы нужная папка была видна в дереве
    state.settings.collapsedFolders = state.settings.collapsedFolders || [];
  }
  renderHeader(); renderPanel();
}
function expandTo(id) {
  const path = new Set(folderPath(id).map((f) => f.id));
  state.settings.collapsedFolders = (state.settings.collapsedFolders || []).filter((x) => !path.has(x) || x === id);
}
function createFolder(parentId = null, name = 'Новая папка') {
  const f = { id: uid(), name: uniqueFolderName(name, parentId), parentId: parentId || null, labels: [], createdAt: Date.now() };
  state.folders.push(f);
  if (parentId) { expandTo(parentId); state.settings.collapsedFolders = state.settings.collapsedFolders.filter((x) => x !== parentId); }
  save();
  return f;
}
function newFolderFlow(parentId = null) {
  const f = createFolder(parentId);
  ensurePanel('folders');
  renderNotes();
  startRenameFolder(f.id);
}
// Переименование прямо в дереве
function inlineRename(item, value, commit) {
  const span = $('.tname', item);
  if (!span) return;
  const inp = document.createElement('input');
  inp.className = 'tinput';
  inp.value = value;
  inp.maxLength = 60;
  span.replaceWith(inp);
  inp.focus(); inp.select();
  let done = false;
  const finish = (ok) => {
    if (done) return;
    done = true;
    const v = inp.value.trim();
    if (ok && v && v !== value) commit(v);
    render();
  };
  inp.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
  });
  inp.addEventListener('blur', () => finish(true));
  inp.addEventListener('click', (e) => e.stopPropagation());
}
function startRenameFolder(id) {
  const f = getFolder(id);
  if (!f) return;
  expandTo(id);
  ensurePanel('folders');
  const item = $(`#tree .titem[data-folder="${id}"]`);
  if (!item) return;
  item.scrollIntoView({ block: 'nearest' });
  inlineRename(item, f.name, (v) => { f.name = v; save(); });
}
async function deleteFolder(id) {
  const f = getFolder(id);
  if (!f) return;
  const ids = folderDescIds(id);
  const k = state.notes.filter((n) => ids.includes(n.folderId)).length;
  const text = `Удалить папку «${f.name}»${ids.length > 1 ? ' вместе с вложенными папками' : ''}?`
    + (k ? ` Заметки (${k}) не удалятся — они останутся в «Все заметки».` : '');
  if (!(await confirmDialog(text, 'Удалить папку'))) return;
  const parent = f.parentId;
  state.folders = state.folders.filter((x) => !ids.includes(x.id));
  state.notes.forEach((n) => { if (ids.includes(n.folderId)) n.folderId = null; });
  if (ui.section === 'folder' && ids.includes(ui.folderId)) {
    if (parent && getFolder(parent)) ui.folderId = parent; else { ui.section = 'notes'; ui.folderId = null; }
  }
  save(); render();
}
function folderMenu(anchor, id) {
  menuPopover(anchor, [
    ['Открыть', () => setSection('folder:' + id)],
    ['Новая подпапка', () => newFolderFlow(id)],
    ['Новая заметка в папке', () => { setSection('folder:' + id); renderAll(); openComposer('text'); }],
    ['Теги папки…', () => { const f = getFolder(id); if (f) labelPopover(anchor, folderLabelOps(f)); }],
    ['Переименовать', () => startRenameFolder(id)],
    ['Удалить папку', () => deleteFolder(id)],
  ]);
}
function moveNotes(arr, folderId) {
  const f = folderId && getFolder(folderId);
  withUndo(f ? `Перемещено в «${f.name}»` : 'Убрано из папки', () => arr.forEach((n) => { n.folderId = folderId || null; touch(n); }));
}
function folderPopover(anchor, currentId, onPick) {
  const c = document.createElement('div');
  c.className = 'lbl-pop';
  c.innerHTML = `<div class="pop-title">Переместить в папку</div><div class="lbl-list"></div>
    <div class="lbl-search lbl-create"><span class="muted">${icon('folderNew', 18)}</span><input type="text" placeholder="Новая папка" maxlength="60"></div>`;
  const listEl = $('.lbl-list', c), inp = $('input', c);
  const rows = [{ f: { id: null, name: 'Без папки' }, depth: 0 }, ...flatFolders()];
  listEl.innerHTML = rows.map(({ f, depth }) =>
    `<button class="menu-item fpick${(f.id || null) === (currentId || null) ? ' cur' : ''}" data-id="${f.id || ''}" style="padding-left:${16 + depth * 16}px">${icon(f.id ? (depth ? 'folderOutline' : 'folder') : 'close', 18)}<span>${esc(f.name)}</span>${(f.id || null) === (currentId || null) ? `<span class="muted">${icon('check', 16)}</span>` : ''}</button>`).join('');
  listEl.addEventListener('click', (e) => {
    const b = e.target.closest('.fpick');
    if (!b) return;
    closePopover();
    onPick(b.dataset.id || null);
  });
  inp.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !inp.value.trim()) return;
    e.preventDefault();
    const f = createFolder(null, inp.value.trim());
    closePopover();
    onPick(f.id);
    renderPanel();
  });
  openPopover(anchor, c);
}

function createTag(name) {
  name = name.trim();
  if (!name) return null;
  if (state.labels.some((l) => l.name.toLowerCase() === name.toLowerCase())) { showSnack('Такой тег уже есть'); return null; }
  const l = { id: uid(), name };
  state.labels.push(l);
  save();
  return l;
}
function startRenameTag(id) {
  const l = state.labels.find((x) => x.id === id);
  if (!l) return;
  ensurePanel('tags');
  const item = $(`#tree .titem[data-label="${id}"]`);
  if (!item) return;
  inlineRename(item, l.name, (v) => {
    if (state.labels.some((x) => x.id !== id && x.name.toLowerCase() === v.toLowerCase())) { showSnack('Такой тег уже есть'); return; }
    l.name = v; save();
  });
}
async function deleteTag(id) {
  const l = state.labels.find((x) => x.id === id);
  if (!l) return;
  if (!(await confirmDialog(`Удалить тег «${l.name}»? Он исчезнет из всех заметок и папок, сами заметки и папки останутся.`, 'Удалить тег'))) return;
  state.labels = state.labels.filter((x) => x !== l);
  state.notes.forEach((n) => { n.labels = n.labels.filter((x) => x !== id); });
  state.folders.forEach((f) => { f.labels = (f.labels || []).filter((x) => x !== id); });
  if (ui.section === 'label' && ui.labelId === id) { ui.section = 'notes'; ui.labelId = null; }
  save(); render();
}
function tagMenu(anchor, id) {
  menuPopover(anchor, [
    ['Показать заметки и папки', () => setSection('label:' + id)],
    ['Переименовать', () => startRenameTag(id)],
    ['Удалить тег', () => deleteTag(id)],
  ]);
}

// ---------- Фон и оформление ----------
async function openBackgroundDialog() {
  const s = await window.api.getSysSettings();
  sysInfo = { ...sysInfo, ...s };
  const el = document.createElement('div');
  el.className = 'dialog bg-dlg';
  const modes = [
    ['acrylic', 'Размытие рабочего стола', s.acrylicSupported ? 'Окно размывает всё, что под ним' : 'Нужна Windows 11 22H2 или новее'],
    ['gradient', 'Градиент', 'Мягкие размытые цвета'],
    ['image', 'Своя картинка', 'Фото на фоне с размытием'],
    ['solid', 'Без прозрачности', 'Однотонный фон'],
  ];
  function paint() {
    const cur = document.body.dataset.bg;
    el.innerHTML = `<div class="dlg-title">Фон и оформление</div>
      <div class="bg-grid">${modes.map(([k, t, d]) => `<button class="bg-opt${cur === k ? ' on' : ''}" data-mode="${k}" ${k === 'acrylic' && !s.acrylicSupported ? 'disabled' : ''}>
        <div class="bg-prev prev-${k}"${k === 'image' && wallpaper ? ` style="background-image:url(&quot;${wallpaper}&quot;)"` : ''}><div class="bg-prev-glass"></div></div>
        <div class="bg-t">${t}</div><div class="bg-d">${d}</div></button>`).join('')}</div>
      <div class="bg-row"><span>Картинка</span><button class="text-btn" data-a="pick">${wallpaper ? 'Заменить…' : 'Выбрать…'}</button>${wallpaper ? '<button class="text-btn" data-a="clear">Убрать</button>' : ''}</div>
      <div class="bg-row"><span>Размытие картинки</span><input type="range" min="0" max="60" step="2" value="${state.settings.blur ?? 28}" id="blurRange"><span class="muted" id="blurVal">${state.settings.blur ?? 28}</span></div>
      <div class="bg-row"><span>Тема</span><div class="seg small"><button data-theme="dark" class="${state.settings.theme !== 'light' ? 'on' : ''}">Тёмная</button><button data-theme="light" class="${state.settings.theme === 'light' ? 'on' : ''}">Светлая</button></div></div>
      <div class="dlg-actions"><button class="text-btn" data-a="done">Готово</button></div>`;
  }
  const setMode = (m) => { state.settings.background = m; save(); applyBackground(); paint(); };
  el.addEventListener('click', (e) => {
    const opt = e.target.closest('.bg-opt');
    if (opt && !opt.disabled) {
      if (opt.dataset.mode === 'image' && !wallpaper) pickWallpaper(() => setMode('image'));
      else setMode(opt.dataset.mode);
      return;
    }
    const th = e.target.closest('[data-theme]');
    if (th) { setTheme(th.dataset.theme); paint(); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'pick') pickWallpaper(() => setMode('image'));
    else if (a === 'clear') { wallpaper = null; window.api.setWallpaper(null); if (state.settings.background === 'image') state.settings.background = null; save(); applyBackground(); paint(); }
    else if (a === 'done') close();
  });
  el.addEventListener('input', (e) => {
    if (e.target.id !== 'blurRange') return;
    state.settings.blur = +e.target.value;
    $('#blurVal', el).textContent = e.target.value;
    document.body.style.setProperty('--blur', e.target.value + 'px');
    save();
  });
  paint();
  const close = openDialog(el);
}
function pickWallpaper(after) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = async () => {
    const url = await fileToDataUrl(inp.files[0], 2560);
    if (!url) return;
    wallpaper = url;
    await window.api.setWallpaper(url);
    after();
  };
  inp.click();
}
function setTheme(theme) {
  state.settings.theme = theme;
  window.api.setTheme(theme);
  save(); applyTheme();
}

function showShortcuts() {
  const el = document.createElement('div');
  el.className = 'dialog';
  const rows = [
    ['C', 'Новая заметка'], ['L', 'Новый список'], ['N', 'Новая папка'], ['/', 'Поиск'], ['Ctrl + G', 'Сетка / список'],
    ['Ctrl + Z', 'Отменить последнее действие'], ['Esc', 'Закрыть заметку или меню'],
    ['Enter (в списке)', 'Новый пункт'], ['Backspace (в начале пункта)', 'Объединить с предыдущим'],
    ['Ctrl + V (в заметке)', 'Вставить картинку из буфера'],
  ];
  el.innerHTML = `<div class="dlg-title">Быстрые клавиши</div><table class="kbd-table">${rows.map(([k, d]) => `<tr><td><kbd>${esc(k)}</kbd></td><td>${esc(d)}</td></tr>`).join('')}</table><div class="dlg-actions"><button class="text-btn">Закрыть</button></div>`;
  const close = openDialog(el);
  $('.text-btn', el).addEventListener('click', close);
}
function showAbout() {
  const el = document.createElement('div');
  el.className = 'dialog';
  const total = state.notes.filter((n) => !n.trashed).length;
  el.innerHTML = `<div class="dlg-title">Заметки 1.3</div><div class="dlg-text">Заметки и списки для компьютера. Все данные хранятся только на этом компьютере.<br><br>Заметок: ${total}, папок: ${state.folders.length}, тегов: ${state.labels.length}.</div><div class="dlg-actions"><button class="text-btn">OK</button></div>`;
  const close = openDialog(el);
  $('.text-btn', el).addEventListener('click', close);
}

// ---------- Уведомление внизу и отмена ----------
let snackTimer = null;
let snackUndo = null;
function showSnack(msg, undo) {
  const s = $('#snackbar');
  s.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button class="snack-btn">Отменить</button>' : ''}<button class="icon-btn small" title="Закрыть">${icon('close', 18)}</button>`;
  s.classList.add('show');
  snackUndo = undo || null;
  clearTimeout(snackTimer);
  snackTimer = setTimeout(hideSnack, 6000);
  if (undo) $('.snack-btn', s).addEventListener('click', () => { hideSnack(); undo(); });
  $('.icon-btn', s).addEventListener('click', hideSnack);
}
function hideSnack() { $('#snackbar').classList.remove('show'); snackUndo = null; }

function makeUndo(fn) { return () => { fn(); save(); render(); }; }
function withUndo(msg, fn) {
  const snapshot = JSON.stringify({ notes: state.notes, files: state.files });
  fn();
  save(); render();
  showSnack(msg, makeUndo(() => { const snap = JSON.parse(snapshot); state.notes = snap.notes; state.files = snap.files; }));
}

// ---------- Действия с заметками ----------
const count = (arr, one, many) => (arr.length > 1 ? `${many}: ${arr.length}` : one);
function trashNotes(arr) {
  withUndo(count(arr, 'Заметка перемещена в корзину', 'Перемещено в корзину'), () => arr.forEach((n) => {
    n.trashed = true; n.trashedAt = Date.now(); n.pinned = false;
  }));
}
function restoreNotes(arr) {
  withUndo(count(arr, 'Заметка восстановлена', 'Восстановлено заметок'), () => arr.forEach((n) => { n.trashed = false; n.trashedAt = null; }));
}
function archiveNotes(arr, archive) {
  withUndo(archive ? count(arr, 'Заметка перенесена в архив', 'Перенесено в архив') : count(arr, 'Заметка извлечена из архива', 'Извлечено из архива'),
    () => arr.forEach((n) => { n.archived = archive; if (archive) n.pinned = false; }));
}
async function destroyNotes(arr) {
  const ok = await confirmDialog(arr.length > 1 ? `Удалить навсегда выбранные заметки (${arr.length})?` : 'Удалить заметку навсегда?', 'Удалить');
  if (!ok) return;
  state.notes = state.notes.filter((n) => !arr.includes(n));
  ui.selected.clear();
  save(); render();
}
async function emptyTrash() {
  const ok = await confirmDialog('Очистить корзину? Все заметки в корзине будут удалены навсегда.', 'Очистить корзину');
  if (!ok) return;
  state.notes = state.notes.filter((n) => !n.trashed);
  save(); render();
}
function duplicateNote(n) {
  const copy = JSON.parse(JSON.stringify(n));
  Object.assign(copy, { id: uid(), order: nextOrder(), createdAt: Date.now(), updatedAt: Date.now(), reminderFired: false });
  copy.items.forEach((i) => { i.id = uid(); });
  state.notes.push(copy);
  save(); render();
  showSnack('Копия заметки создана', makeUndo(() => { state.notes = state.notes.filter((x) => x !== copy); }));
}
function noteAsText(n) {
  const body = n.type === 'list' ? n.items.map((i) => `${i.done ? '☑' : '☐'} ${i.text}`).join('\n') : n.content;
  return [n.title, body].filter(Boolean).join('\n\n');
}
function copyNoteText(n) { window.api.copyText(noteAsText(n)); showSnack('Текст заметки скопирован'); }

function reorder(dragId, targetId) {
  const a = getNote(dragId), b = getNote(targetId);
  if (!a || !b || a === b) return;
  const list = visibleNotes().filter((n) => n.pinned === b.pinned);
  const origA = list.indexOf(a), origB = list.indexOf(b);
  const members = origA === -1 ? [...list, a] : list;
  const orders = members.map((n) => n.order).sort((x, y) => y - x);
  const arr = list.filter((n) => n !== a);
  const idx = arr.indexOf(b);
  arr.splice(origA !== -1 && origA < origB ? idx + 1 : idx, 0, a);
  arr.forEach((n, i) => { n.order = orders[i]; });
  a.pinned = b.pinned;
  save(); renderNotes();
}

function cardAction(act, n, btn) {
  if (popover && popover.anchor === btn) { closePopover(); return; }
  switch (act) {
    case 'select': toggleSelect(n.id); break;
    case 'pin':
      n.pinned = !n.pinned;
      if (n.pinned && n.archived) { n.archived = false; showSnack('Заметка извлечена из архива и закреплена'); }
      touch(n); save(); renderNotes(); break;
    case 'remind': reminderPopover(btn, n, () => { touch(n); save(); renderNotes(); }); break;
    case 'open-reminder': if (!n.trashed) reminderPopover(btn, n, () => { touch(n); save(); renderNotes(); }); break;
    case 'color': colorPopover(btn, n.color, (c) => { n.color = c; touch(n); save(); renderNotes(); }); break;
    case 'image': pickImages((imgs) => { n.images.push(...imgs); touch(n); save(); renderNotes(); }); break;
    case 'attach': window.api.pickFiles().then((metas) => { if (!metas.length) return; n.files = [...(n.files || []), ...metas]; touch(n); save(); render(); showSnack(`Прикреплено: ${filesWord(metas.length)}`); }); break;
    case 'open-file': { const f = (n.files || []).find((x) => x.id === btn.dataset.file); if (f) openFileMeta(f); break; }
    case 'files-more': openNoteModal(n.id); break;
    case 'archive': archiveNotes([n], !n.archived); break;
    case 'more':
      menuPopover(btn, [
        ['Удалить заметку', () => trashNotes([n])],
        ['Переместить в папку', () => folderPopover(btn, n.folderId, (id) => moveNotes([n], id))],
        [n.labels.length ? 'Изменить теги' : 'Добавить тег', () => labelPopover(btn, singleLabelOps(n, () => { touch(n); save(); renderNotes(); renderPanel(); }))],
        ['Создать копию', () => duplicateNote(n)],
        [n.type === 'list' ? 'Скрыть флажки' : 'Показать флажки', () => { toggleListMode(n); save(); renderNotes(); }],
        ['Копировать текст', () => copyNoteText(n)],
      ]);
      break;
    case 'restore': restoreNotes([n]); break;
    case 'destroy': destroyNotes([n]); break;
    case 'check': {
      if (n.trashed) return;
      const item = n.items.find((i) => i.id === btn.closest('.ci').dataset.item);
      if (item) { item.done = true; touch(n); save(); renderNotes(); }
      break;
    }
    case 'rm-reminder': n.reminder = null; n.reminderFired = false; n.repeat = 'none'; touch(n); save(); renderNotes(); break;
    case 'rm-label': n.labels = n.labels.filter((x) => x !== btn.dataset.label); touch(n); save(); renderNotes(); break;
    case 'goto-label': setSection('label:' + btn.dataset.label); break;
    case 'goto-folder': setSection('folder:' + btn.dataset.folder); break;
    case 'rm-folder': moveNotes([n], null); break;
  }
}

// ---------- Выделение нескольких заметок ----------
function toggleSelect(id) {
  if (ui.selected.has(id)) ui.selected.delete(id); else ui.selected.add(id);
  document.querySelector(`.card[data-id="${id}"]`)?.classList.toggle('selected', ui.selected.has(id));
  renderSelbar();
}
const selNotes = () => [...ui.selected].map(getNote).filter(Boolean);
function renderSelbar() {
  const n = ui.selected.size;
  document.body.classList.toggle('selecting', n > 0);
  if (!n) return;
  $('#selCount').textContent = `Выбрано: ${n}`;
  const sel = selNotes();
  const allPinned = sel.every((x) => x.pinned), allArchived = sel.every((x) => x.archived);
  const acts = ui.section === 'trash'
    ? [['restore', 'restore', 'Восстановить'], ['destroy', 'deleteForever', 'Удалить навсегда']]
    : [['pin', allPinned ? 'pinOn' : 'pin', allPinned ? 'Открепить' : 'Закрепить'], ['color', 'palette', 'Цвет фона'], ['move', 'folder', 'Переместить в папку'], ['label', 'tag', 'Теги'],
      ['archive', allArchived ? 'unarchive' : 'archive', allArchived ? 'Вернуть из архива' : 'Архивировать'], ['delete', 'delete', 'Удалить']];
  $('#selActions').innerHTML = acts.map(([a, ic, t]) => `<button class="icon-btn small" data-act="${a}" title="${t}">${icon(ic, 20)}</button>`).join('');
}
function selAction(act, btn) {
  const sel = selNotes();
  if (!sel.length) return;
  if (popover && popover.anchor === btn) { closePopover(); return; }
  const done = () => { ui.selected.clear(); };
  switch (act) {
    case 'pin': {
      const v = !sel.every((x) => x.pinned);
      sel.forEach((x) => { x.pinned = v; if (v) x.archived = false; });
      done(); save(); renderNotes(); break;
    }
    case 'color': colorPopover(btn, null, (c) => { sel.forEach((x) => { x.color = c; }); save(); renderNotes(); }); break;
    case 'label':
      labelPopover(btn, {
        isChecked: (id) => { const k = sel.filter((x) => x.labels.includes(id)).length; return k === sel.length ? true : k ? 'some' : false; },
        toggle: (id, on) => { sel.forEach((x) => { x.labels = on ? [...new Set([...x.labels, id])] : x.labels.filter((y) => y !== id); }); renderNotes(); },
      });
      break;
    case 'move': folderPopover(btn, null, (id) => { done(); moveNotes(sel, id); }); break;
    case 'archive': { const v = !sel.every((x) => x.archived); done(); archiveNotes(sel, v); break; }
    case 'delete': done(); trashNotes(sel); break;
    case 'restore': done(); restoreNotes(sel); break;
    case 'destroy': destroyNotes(sel); break;
  }
}

// ---------- Картинки ----------
function readAsDataURL(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
}
function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
async function fileToDataUrl(file, MAX = 1600) {
  if (!file || !file.type.startsWith('image/')) return null;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImg(url);
    const { naturalWidth: w, naturalHeight: h } = img;
    if (file.type === 'image/gif' || (w <= MAX && h <= MAX && file.size < 1.5e6)) return await readAsDataURL(file);
    const k = Math.min(1, MAX / Math.max(w, h));
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * k); cv.height = Math.round(h * k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.88);
  } catch { return null; } finally { URL.revokeObjectURL(url); }
}
function pickImages(cb) {
  const inp = $('#fileInput');
  inp.value = '';
  inp.onchange = async () => {
    const imgs = (await Promise.all([...inp.files].map(fileToDataUrl))).filter(Boolean);
    if (imgs.length) cb(imgs);
  };
  inp.click();
}

// ---------- Напоминания ----------
function nextRepeat(t, rep, now) {
  const d = new Date(t);
  do {
    if (rep === 'daily') d.setDate(d.getDate() + 1);
    else if (rep === 'weekly') d.setDate(d.getDate() + 7);
    else if (rep === 'monthly') d.setMonth(d.getMonth() + 1);
    else d.setFullYear(d.getFullYear() + 1);
  } while (d.getTime() <= now);
  return d;
}
function checkReminders() {
  const now = Date.now();
  let changed = false;
  for (const n of state.notes) {
    if (!n.reminder || n.trashed || n.reminderFired) continue;
    const t = new Date(n.reminder).getTime();
    if (isNaN(t) || t > now) continue;
    if (now - t < 24 * 3600e3) {
      const text = noteAsText({ ...n, title: '' }).slice(0, 200);
      window.api.notify({ id: n.id, title: n.title || 'Напоминание', body: text || n.title || 'Заметка' });
      showSnack(`Напоминание: ${n.title || text.split('\n')[0] || 'заметка'}`);
    }
    if (n.repeat && n.repeat !== 'none') n.reminder = nextRepeat(t, n.repeat, now).toISOString();
    else n.reminderFired = true;
    changed = true;
  }
  if (changed) { save(); if (!modal) renderNotes(); }
}
function cleanupTrash() {
  const limit = Date.now() - TRASH_DAYS * 864e5;
  const before = state.notes.length;
  state.notes = state.notes.filter((n) => !(n.trashed && n.trashedAt && n.trashedAt < limit));
  if (state.notes.length !== before) save();
}

// ---------- Импорт / экспорт ----------
function exportNotes() {
  window.api.exportData({ app: 'zametki', version: 2, exportedAt: new Date().toISOString(), notes: state.notes, labels: state.labels, folders: state.folders, files: state.files, boards: state.boards })
    .then((ok) => { if (ok) showSnack('Заметки и доски экспортированы'); });
}
async function importNotes() {
  const files = await window.api.importData();
  if (!files) return;
  const labelIdByName = (name) => {
    let l = state.labels.find((x) => x.name.toLowerCase() === String(name).toLowerCase());
    if (!l) { l = { id: uid(), name: String(name) }; state.labels.push(l); }
    return l.id;
  };
  const imported = [];
  let importedBoards = 0;
  let skipped = 0;
  for (const f of files) {
    const d = f.data;
    if (f.error || !d || typeof d !== 'object') { skipped++; continue; }
    if (Array.isArray(d.boards)) {
      for (const board of d.boards) {
        if (!board || typeof board !== 'object') continue;
        state.boards.push(normalizeBoard({ ...board, id: uid() }));
        importedBoards++;
      }
    }
    if (Array.isArray(d.notes)) {
      const map = {};
      (d.labels || []).forEach((l) => { if (l && l.name) map[l.id] = labelIdByName(l.name); });
      const fmap = {};
      (d.folders || []).forEach((f) => { if (f && f.id) fmap[f.id] = uid(); });
      (d.folders || []).forEach((f) => { if (f && f.id) state.folders.push({ id: fmap[f.id], name: String(f.name || 'Папка'), parentId: fmap[f.parentId] || null, labels: (f.labels || []).map((x) => map[x]).filter(Boolean) }); });
      for (const n of d.notes) {
        if (!n || typeof n !== 'object') continue;
        const nn = { ...newNote(), ...n };
        if (!nn.id || getNote(nn.id)) nn.id = uid();
        nn.labels = (n.labels || []).map((id) => map[id]).filter(Boolean);
        nn.folderId = fmap[n.folderId] || null;
        nn.items = Array.isArray(nn.items) ? nn.items : [];
        nn.images = Array.isArray(nn.images) ? nn.images : [];
        imported.push(nn);
      }
    } else if ('textContent' in d || 'listContent' in d || 'userEditedTimestampUsec' in d) {
      // Файл заметки Google Keep из Google Takeout
      const n = newNote({
        title: d.title || '',
        color: KEEP_COLORS[d.color] || 'default',
        pinned: !!d.isPinned, archived: !!d.isArchived, trashed: !!d.isTrashed,
        trashedAt: d.isTrashed ? Date.now() : null,
        createdAt: d.createdTimestampUsec ? Math.floor(d.createdTimestampUsec / 1000) : Date.now(),
        updatedAt: d.userEditedTimestampUsec ? Math.floor(d.userEditedTimestampUsec / 1000) : Date.now(),
      });
      if (Array.isArray(d.listContent) && d.listContent.length) {
        n.type = 'list';
        n.items = d.listContent.map((i) => ({ id: uid(), text: i.text || '', done: !!i.isChecked }));
      } else n.content = d.textContent || '';
      if (Array.isArray(d.annotations)) {
        const links = d.annotations.map((a) => a.url).filter((u) => u && !n.content.includes(u));
        if (links.length && n.type === 'text') n.content += (n.content ? '\n\n' : '') + links.join('\n');
      }
      n.labels = (d.labels || []).map((l) => labelIdByName(l.name));
      n.images = (d.attachments || []).map((a) => f.attachments?.[a.filePath]).filter(Boolean);
      imported.push(n);
    } else if (!Array.isArray(d.boards)) skipped++;
  }
  imported.sort((a, b) => a.updatedAt - b.updatedAt);
  let base = nextOrder();
  imported.forEach((n) => { n.order = base++; state.notes.push(n); });
  save(); render();
  showSnack(`Импортировано заметок: ${imported.length}${importedBoards ? `, досок: ${importedBoards}` : ''}${skipped ? `, пропущено файлов: ${skipped}` : ''}`);
}

async function openAppMenu(btn) {
  if (popover && popover.anchor === btn) { closePopover(); return; }
  const s = await window.api.getSysSettings();
  const items = [['Фон и оформление…', openBackgroundDialog]];
  if (!s.web) {
    items.push(['Сворачивать в трей при закрытии', () => window.api.setCloseToTray(!s.closeToTray), { checked: s.closeToTray }]);
    items.push(['Запускать вместе с Windows', () => window.api.setAutostart(!s.autostart), { checked: s.autostart }]);
  }
  items.push(['Экспорт заметок и досок…', exportNotes], ['Импорт заметок и досок…', importNotes], ['Быстрые клавиши', showShortcuts], ['О приложении', showAbout]);
  menuPopover(btn, items);
}

// ---------- Доски ----------
function createBoard() {
  const now = Date.now();
  const board = normalizeBoard({ id: uid(), title: 'Новая доска', elements: [], connections: [], camera: { x: 0, y: 0, zoom: 1 }, createdAt: now, updatedAt: now });
  state.boards.unshift(board);
  save();
  setSection(`board:${board.id}`);
  requestAnimationFrame(() => $('#boardTitle')?.focus());
}

function addBoardElement(type) {
  const board = getBoard(ui.boardId);
  if (!board || !['sticky', 'text', 'shape'].includes(type)) return;
  const positions = [[0, 0], [-270, -170], [270, -170], [-270, 150], [270, 150], [0, 310]];
  const position = positions[board.elements.length % positions.length];
  const element = { id: uid(), type, x: position[0], y: position[1], text: '', color: type === 'shape' ? 'blue' : 'sun' };
  board.elements.push(element);
  board.updatedAt = Date.now();
  save();
  renderBoard();
  renderPanel();
  requestAnimationFrame(() => {
    [...$('#boardWorld').querySelectorAll('.board-node')]
      .find((node) => node.dataset.nodeId === element.id)?.querySelector('[data-board-text]')?.focus();
  });
}

async function deleteBoard(id) {
  const board = getBoard(id);
  if (!board || !(await confirmDialog(`Удалить доску «${board.title}» и все её элементы?`, 'Удалить доску'))) return;
  state.boards = state.boards.filter((item) => item.id !== id);
  save();
  setSection('boards');
  showSnack('Доска удалена');
}

function boardMenu(anchor, id) {
  const board = getBoard(id);
  if (!board) return;
  menuPopover(anchor, [
    ['Открыть', () => setSection(`board:${id}`)],
    ['Переименовать', () => {
      setSection(`board:${id}`);
      requestAnimationFrame(() => { const input = $('#boardTitle'); input?.focus(); input?.select(); });
    }],
    ['Удалить', () => deleteBoard(id)],
  ]);
}

// ---------- Навигация ----------
function createCalendarReminder() {
  if (modal) closeModal();
  const selectedDate = new Date(ui.calendarDate);
  const reminderDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 9, 0, 0, 0);
  const now = new Date();
  if (sameCalendarDay(reminderDate, now) && reminderDate <= now) {
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    if (sameCalendarDay(nextHour, reminderDate)) reminderDate.setTime(nextHour.getTime());
    else reminderDate.setHours(23, 59, 59, 999);
  }
  const note = newNote({ reminder: reminderDate.toISOString() });
  note.order = nextOrder();
  state.notes.push(note);
  save();
  render();
  requestAnimationFrame(() => openNoteModal(note.id));
}

function setSection(key) {
  closeComposer();
  closePopover();
  const previousSection = ui.section;
  const openingBoard = key.startsWith('board:');
  if (previousSection === 'board' && !openingBoard && ui.restorePanelAfterBoard) {
    state.settings.panelCollapsed = false;
    ui.restorePanelAfterBoard = false;
  }
  if (openingBoard && window.innerWidth <= 720 && !state.settings.panelCollapsed) {
    state.settings.panelCollapsed = true;
    ui.restorePanelAfterBoard = true;
  }
  ui.labelId = null; ui.folderId = null; ui.boardId = null;
  if (key.startsWith('label:')) { ui.section = 'label'; ui.labelId = key.slice(6); }
  else if (key.startsWith('folder:')) { ui.section = 'folder'; ui.folderId = key.slice(7); expandTo(ui.folderId); }
  else if (key.startsWith('board:')) {
    const board = getBoard(key.slice(6));
    if (board) { ui.section = 'board'; ui.boardId = board.id; } else ui.section = 'boards';
  } else ui.section = key;
  ui.search = '';
  $('#search').value = '';
  ui.selected.clear();
  render();
  $('#main').scrollTop = 0;
}
function startNew(type) {
  if (modal) closeModal();
  if (composerAllowed()) { openComposer(type); return; }
  setSection('notes');
  renderAll();
  openComposer(type);
}
function toggleView() {
  state.settings.view = state.settings.view === 'grid' ? 'list' : 'grid';
  save(); updateGridWidth(); renderHeader(); renderNotes();
}
function togglePanel(collapsed) {
  if (ui.section === 'calendar') {
    ui.calendarPanelOpen = !collapsed;
    renderHeader();
    return;
  }
  state.settings.panelCollapsed = collapsed;
  save(); renderHeader();
}

// ---------- Привязка событий ----------
function bindEvents() {
  $('#searchIcon').innerHTML = icon('search', 18);
  $('#clearSearch').innerHTML = icon('close', 16);
  $('#appMenuBtn').innerHTML = icon('settings', 22);
  $('#bgBtn').innerHTML = icon('wallpaper', 22);
  $('#selClose').innerHTML = icon('close', 20);
  $('#panelCollapse').innerHTML = icon('sidebar', 18);
  $('#panelExpand').innerHTML = icon('sidebar', 18);
  $('#newNoteBtn').innerHTML = icon('add', 22);

  $('#railNav').addEventListener('click', (e) => { const b = e.target.closest('[data-key]'); if (b) setSection(b.dataset.key); });
  $('#viewToggle').addEventListener('click', toggleView);
  $('#newNoteBtn').addEventListener('click', () => startNew('text'));
  $('#themeToggle').addEventListener('click', () => setTheme(state.settings.theme === 'light' ? 'dark' : 'light'));
  $('#bgBtn').addEventListener('click', openBackgroundDialog);
  $('#appMenuBtn').addEventListener('click', (e) => openAppMenu(e.currentTarget));
  $('#panelCollapse').addEventListener('click', () => togglePanel(true));
  $('#panelExpand').addEventListener('click', () => togglePanel(false));

  const boardTitle = $('#boardTitle');
  boardTitle.addEventListener('input', () => {
    const board = getBoard(ui.boardId);
    if (!board || ui.section !== 'board') return;
    board.title = boardTitle.value.trim().slice(0, 80) || 'Новая доска';
    board.updatedAt = Date.now();
    const crumb = $('#crumbs .board-crumb-title');
    if (crumb) crumb.textContent = board.title;
    save();
  });
  boardTitle.addEventListener('blur', () => {
    const board = getBoard(ui.boardId);
    if (!board || ui.section !== 'board') return;
    board.title = board.title.trim() || 'Новая доска';
    boardTitle.value = board.title;
    save();
    renderHeader();
    renderPanel();
  });
  const updateBoardConnectUI = (active) => {
    const button = $('#boardConnect');
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    const hint = $('#boardHint');
    hint.hidden = !active;
    hint.textContent = active ? 'Выберите два элемента, чтобы соединить их. Нажмите Esc, чтобы отменить.' : '';
  };
  window.BoardCanvas.mount({
    canvas: $('#boardCanvas'),
    world: $('#boardWorld'),
    onChange: () => {
      const board = getBoard(ui.boardId);
      if (board) { board.updatedAt = Date.now(); save(); renderPanel(); }
    },
    onModeChange: updateBoardConnectUI,
    onZoomChange: (zoom) => { $('#boardZoom').textContent = `${Math.round(zoom * 100)}%`; },
  });
  $('#boardWorkspace').addEventListener('click', (e) => {
    const action = e.target.closest('[data-board-action]')?.dataset.boardAction;
    if (!action) return;
    if (action === 'add-sticky') addBoardElement('sticky');
    else if (action === 'add-text') addBoardElement('text');
    else if (action === 'add-shape') addBoardElement('shape');
    else if (action === 'connect') window.BoardCanvas.setConnectMode(!window.BoardCanvas.isConnectMode());
    else if (action === 'zoom-in') window.BoardCanvas.zoomBy(1.12);
    else if (action === 'zoom-out') window.BoardCanvas.zoomBy(1 / 1.12);
    else if (action === 'fit') window.BoardCanvas.fitToBoard();
    else if (action === 'delete') deleteBoard(ui.boardId);
  });

  const search = $('#search');
  search.addEventListener('input', () => { ui.search = search.value; ui.selected.clear(); render(); });
  search.addEventListener('focus', () => $('#searchBox').classList.add('focused'));
  search.addEventListener('blur', () => $('#searchBox').classList.remove('focused'));
  $('#clearSearch').addEventListener('click', () => { search.value = ''; ui.search = ''; render(); search.focus(); });

  // Панель: переключатель «Папки / Теги», дерево, список тегов
  $('#seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    state.settings.panelTab = b.dataset.tab;
    save(); renderPanel();
  });
  $('#panelAdd').addEventListener('click', () => {
    if (['boards', 'board'].includes(ui.section)) { createBoard(); return; }
    if (state.settings.panelTab === 'tags') $('#newTag')?.focus();
    else newFolderFlow(ui.section === 'folder' ? ui.folderId : null);
  });
  const tree = $('#tree');
  tree.addEventListener('click', (e) => {
    if (e.target.closest('input')) return;
    const boardOpen = e.target.closest('[data-board-open]');
    if (boardOpen) { setSection(`board:${boardOpen.dataset.boardOpen}`); return; }
    const boardMenuButton = e.target.closest('[data-board-menu]');
    if (boardMenuButton) { boardMenu(boardMenuButton, boardMenuButton.dataset.boardMenu); return; }
    if (e.target.closest('[data-global="new-folder"]')) { newFolderFlow(null); return; }
    const item = e.target.closest('.titem');
    if (!item) return;
    const actEl = e.target.closest('[data-act]');
    const act = actEl?.dataset.act;
    if (act === 'toggle') {
      const id = item.dataset.folder;
      const set = new Set(state.settings.collapsedFolders || []);
      if (set.has(id)) set.delete(id); else set.add(id);
      state.settings.collapsedFolders = [...set];
      save(); renderPanel();
      return;
    }
    if (act === 'fmenu') { folderMenu(actEl, item.dataset.folder); return; }
    if (act === 'tmenu') { tagMenu(actEl, item.dataset.label); return; }
    if (item.dataset.key) setSection(item.dataset.key);
    else if (item.dataset.folder) setSection('folder:' + item.dataset.folder);
    else if (item.dataset.label) setSection('label:' + item.dataset.label);
  });
  tree.addEventListener('dblclick', (e) => {
    const item = e.target.closest('.titem');
    if (!item || e.target.closest('input, button')) return;
    if (item.dataset.folder) startRenameFolder(item.dataset.folder);
    else if (item.dataset.label) startRenameTag(item.dataset.label);
  });
  tree.addEventListener('keydown', (e) => {
    if (e.target.id !== 'newTag' || e.key !== 'Enter') return;
    e.preventDefault();
    const l = createTag(e.target.value);
    if (l) { renderPanel(); $('#newTag').focus(); }
  });

  // Заголовок: крошки и меню папки/тега
  $('#crumbs').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (popover && popover.anchor === b) { closePopover(); return; }
    if (b.dataset.act === 'goto-label') setSection('label:' + b.dataset.label);
    else if (b.dataset.act === 'ftags') { const f = getFolder(b.dataset.folder); if (f) labelPopover(b, folderLabelOps(f)); }
    else if (b.dataset.act === 'fmenu') folderMenu(b, b.dataset.folder);
    else if (b.dataset.act === 'tmenu') tagMenu(b, b.dataset.label);
    else if (b.dataset.folder) setSection('folder:' + b.dataset.folder);
    else if (b.dataset.key) setSection(b.dataset.key);
  });

  $('#selClose').addEventListener('click', () => { ui.selected.clear(); renderNotes(); });
  $('#selActions').addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b) selAction(b.dataset.act, b); });

  const content = $('#content');
  content.addEventListener('click', (e) => {
    const calendarAction = e.target.closest('[data-calendar-action]');
    if (calendarAction) {
      const action = calendarAction.dataset.calendarAction;
      if (action === 'previous-month' || action === 'next-month') {
        const selected = new Date(ui.calendarDate);
        const month = new Date(selected.getFullYear(), selected.getMonth() + (action === 'previous-month' ? -1 : 1), 1);
        const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
        month.setDate(Math.min(selected.getDate(), lastDay));
        ui.calendarDate = month;
        renderNotes();
      } else if (action === 'today') {
        ui.calendarDate = new Date();
        renderNotes();
      } else if (action === 'add') createCalendarReminder();
      return;
    }
    const calendarDay = e.target.closest('[data-calendar-day]');
    if (calendarDay) {
      ui.calendarDate = calendarDateFromKey(calendarDay.dataset.calendarDay);
      renderNotes();
      return;
    }
    const calendarNote = e.target.closest('[data-calendar-note]');
    if (calendarNote) { openNoteModal(calendarNote.dataset.calendarNote); return; }
    if (e.target.closest('[data-global="create-board"]')) { createBoard(); return; }
    const boardOpen = e.target.closest('[data-board-open]');
    if (boardOpen) { setSection(`board:${boardOpen.dataset.boardOpen}`); return; }
    if (e.target.closest('[data-global="empty-trash"]')) { emptyTrash(); return; }
    if (e.target.closest('[data-global="new-folder"]')) { newFolderFlow(ui.section === 'folder' ? ui.folderId : null); return; }
    const up = e.target.closest('[data-global="upload"]');
    if (up) { uploadToFolder(up.dataset.folder || null); return; }
    if (e.target.closest('[data-global="all-files"]')) { setSection('files'); return; }
    const frow = e.target.closest('.frow');
    if (frow) {
      const ent = findFile(frow.dataset.file);
      if (!ent) return;
      const ab = e.target.closest('[data-act]');
      const act = ab?.dataset.act;
      if (act === 'show-file') showFileMeta(ent.f);
      else if (act === 'file-menu') { if (popover && popover.anchor === ab) closePopover(); else fileMenu(ab, ent.f.id); }
      else if (act === 'open-note') openNoteModal(ab.dataset.note);
      else if (act === 'goto-folder') setSection('folder:' + ab.dataset.folder);
      else openFileMeta(ent.f);
      return;
    }
    const fcard = e.target.closest('.fcard[data-folder]');
    const ftag = fcard && e.target.closest('[data-act="goto-label"]');
    if (ftag) { setSection('label:' + ftag.dataset.label); return; }
    if (fcard) {
      const mb = e.target.closest('[data-act="fmenu"]');
      if (mb) { if (popover && popover.anchor === mb) closePopover(); else folderMenu(mb, fcard.dataset.folder); }
      else setSection('folder:' + fcard.dataset.folder);
      return;
    }
    const card = e.target.closest('.card');
    if (!card) return;
    const n = getNote(card.dataset.id);
    if (!n) return;
    const actEl = e.target.closest('[data-act]');
    if (actEl && card.contains(actEl)) { e.stopPropagation(); cardAction(actEl.dataset.act, n, actEl); return; }
    if (ui.selected.size || e.ctrlKey || e.shiftKey) { toggleSelect(n.id); return; }
    openNoteModal(n.id);
  });

  // Перетаскивание карточек: смена порядка и перенос в папку
  const clearDrop = () => document.querySelectorAll('.drop-before, .drop-into').forEach((x) => x.classList.remove('drop-before', 'drop-into'));
  const dropTarget = (t) => t.closest?.('.fcard[data-folder], #tree .titem[data-folder], #tree .titem[data-key="notes"]');
  const dragIds = () => (ui.selected.has(cardDragId) ? [...ui.selected] : [cardDragId]).map(getNote).filter(Boolean);
  content.addEventListener('dragstart', (e) => {
    const card = e.target.closest?.('.card');
    if (!card || !canDrag()) return;
    closePopover();
    cardDragId = card.dataset.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', noteAsText(getNote(cardDragId)));
    requestAnimationFrame(() => card.classList.add('dragging'));
  });
  const onDragOver = (e) => {
    if (!cardDragId) return;
    e.preventDefault();
    clearDrop();
    const ft = dropTarget(e.target);
    if (ft) { ft.classList.add('drop-into'); return; }
    const card = e.target.closest('.card');
    if (card && card.dataset.id !== cardDragId && canReorder()) card.classList.add('drop-before');
  };
  const onDrop = (e) => {
    if (!cardDragId) return;
    e.preventDefault();
    const id = cardDragId;
    cardDragId = null;
    clearDrop();
    const ft = dropTarget(e.target);
    if (ft) { moveNotes(dragIds(), ft.dataset.folder || null); ui.selected.clear(); return; }
    const card = e.target.closest('.card');
    if (card && card.dataset.id !== id && canReorder()) reorder(id, card.dataset.id); else renderNotes();
  };
  [content, tree].forEach((el) => { el.addEventListener('dragover', onDragOver); el.addEventListener('drop', onDrop); });
  document.addEventListener('dragend', () => { cardDragId = null; clearDrop(); content.querySelectorAll('.dragging').forEach((x) => x.classList.remove('dragging')); });

  // Файлы из проводника: в открытую папку или в «Файлы»
  const mainEl = $('#main');
  let dropTimer = null;
  const hideDrop = () => { clearTimeout(dropTimer); document.body.classList.remove('file-drop'); };
  const isFileDrag = (e) => !cardDragId && e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  const dropFolder = () => (ui.section === 'folder' ? ui.folderId : null);
  mainEl.addEventListener('dragover', (e) => {
    if (!isFileDrag(e) || e.target.closest('.editor')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const f = dropFolder() && getFolder(dropFolder());
    $('#dropHint').textContent = f ? `Отпустите, чтобы загрузить в «${f.name}»` : 'Отпустите, чтобы загрузить файлы';
    document.body.classList.add('file-drop');
    clearTimeout(dropTimer);
    dropTimer = setTimeout(hideDrop, 200);
  });
  mainEl.addEventListener('drop', async (e) => {
    if (!isFileDrag(e) || e.target.closest('.editor')) return;
    e.preventDefault();
    hideDrop();
    const files = [...e.dataTransfer.files];
    if (!files.length) return;
    const folderId = dropFolder();
    addLooseFiles(await importFileObjects(files), folderId);
  });
  // Не даём окну открыть файл, если его бросили мимо
  window.addEventListener('dragover', (e) => { if (isFileDrag(e)) e.preventDefault(); });
  window.addEventListener('drop', (e) => { if (isFileDrag(e)) e.preventDefault(); });

  document.addEventListener('mousedown', (e) => {
    const t = e.target;
    if (popover && !popover.el.contains(t) && !popover.anchor.contains(t)) closePopover();
    if (composer.expanded && !$('#composerWrap').contains(t) && !$('#popoverRoot').contains(t)
      && !$('#modalRoot').contains(t) && !$('#snackbar').contains(t)) closeComposer();
  });

  document.addEventListener('keydown', (e) => {
    const typing = !!e.target.closest?.('input, textarea, select, [contenteditable]');
    if (e.key === 'Escape') {
      if (window.BoardCanvas.isConnectMode()) { window.BoardCanvas.setConnectMode(false); return; }
      if (popover) { closePopover(); return; }
      if (dialogs.length) { dialogs[dialogs.length - 1].close(); return; }
      if (modal) { closeModal(); return; }
      if (composer.expanded) { closeComposer(); return; }
      if (ui.selected.size) { ui.selected.clear(); renderNotes(); return; }
      if (ui.search) { $('#search').value = ''; ui.search = ''; render(); $('#search').blur(); }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyG' && !['boards', 'board'].includes(ui.section)) { e.preventDefault(); toggleView(); return; }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !typing && snackUndo) { e.preventDefault(); const u = snackUndo; hideSnack(); u(); return; }
    if (['boards', 'board'].includes(ui.section) || typing || e.ctrlKey || e.altKey || e.metaKey || modal || dialogs.length) return;
    if (e.code === 'KeyC') { e.preventDefault(); startNew('text'); }
    else if (e.code === 'KeyL') { e.preventDefault(); startNew('list'); }
    else if (e.code === 'KeyN') { e.preventDefault(); newFolderFlow(ui.section === 'folder' ? ui.folderId : null); }
    else if (e.key === '/' || e.code === 'Slash') { e.preventDefault(); $('#search').focus(); }
  });

  new ResizeObserver(updateGridWidth).observe($('#main'));

  window.api.onOpenNote((id) => {
    const n = getNote(id);
    if (!n) return;
    if (n.trashed) setSection('trash');
    requestAnimationFrame(() => openNoteModal(id));
  });
  window.api.onNewNote(() => startNew('text'));
}

function seed() {
  const personal = { id: uid(), name: 'личное' };
  const ideas = { id: uid(), name: 'идеи' };
  state.labels.push(personal, ideas);
  const work = { id: uid(), name: 'Работа', parentId: null };
  const projects = { id: uid(), name: 'Проекты', parentId: work.id };
  const home = { id: uid(), name: 'Дом', parentId: null };
  state.folders.push(work, projects, home);
  state.notes.push(newNote({
    title: 'Добро пожаловать в «Заметки»!',
    content: 'Нажмите на заметку, чтобы изменить её.\n\n• Слева — папки и теги. Папки можно вкладывать друг в друга\n• Перетащите карточку на папку, чтобы переместить её\n• C — новая заметка, L — список, N — папка, / — поиск\n• Ctrl+клик — выбрать несколько заметок\n• Фон и прозрачность — кнопка с картинкой внизу слева',
    color: 'sand', pinned: true, order: 3,
  }));
  state.notes.push(newNote({
    title: 'Список покупок', type: 'list', color: 'mint', order: 2, labels: [personal.id], folderId: home.id,
    items: ['Хлеб', 'Молоко', 'Яблоки', 'Кофе'].map((t, i) => ({ id: uid(), text: t, done: i === 3 })),
  }));
  state.notes.push(newNote({
    title: 'Идея для проекта', content: 'Сделать приложение для заметок с папками и стеклянным интерфейсом.', order: 1,
    labels: [ideas.id], folderId: projects.id, color: 'dusk',
  }));
  const firstIdea = uid(), secondIdea = uid(), firstStep = uid();
  const now = Date.now();
  state.boards.push(normalizeBoard({
    id: uid(), title: 'Идеи проекта', createdAt: now, updatedAt: now,
    camera: { x: 0, y: 0, zoom: 1 },
    elements: [
      { id: firstIdea, type: 'sticky', x: -270, y: -70, text: 'Собрать важные мысли в одном месте.', color: 'sun' },
      { id: secondIdea, type: 'sticky', x: 0, y: -150, text: 'Разложить большую идею на понятные этапы.', color: 'pink' },
      { id: firstStep, type: 'shape', x: 270, y: -70, text: 'Первый шаг', color: 'mint' },
    ],
    connections: [{ from: firstIdea, to: secondIdea }, { from: secondIdea, to: firstStep }],
  }));
}

async function init() {
  let data = null;
  try { data = await window.api.load(); } catch {}
  try { sysInfo = { ...sysInfo, ...(await window.api.getSysSettings()) }; } catch {}
  try { wallpaper = await window.api.getWallpaper(); } catch {}
  if (data && Array.isArray(data.notes)) {
    const def = defaultState();
    state = { ...def, ...data, settings: { ...def.settings, ...(data.settings || {}) } };
    state.labels = Array.isArray(state.labels) ? state.labels : [];
    state.folders = Array.isArray(state.folders) ? state.folders : [];
    state.files = Array.isArray(state.files) ? state.files : [];
    state.boards = Array.isArray(state.boards) ? state.boards.map(normalizeBoard) : [];
    state.folders.forEach((f) => { if (!Array.isArray(f.labels)) f.labels = []; });
    state.notes = state.notes.map((n) => ({ ...newNote(), ...n }));
    if (!data.settings?.designV2) { state.settings.theme = 'dark'; state.settings.designV2 = true; }
    state.version = 3;
    if (data.version !== 3 || !Array.isArray(data.boards) || !data.settings?.designV2) save();
  } else {
    seed();
    save();
  }
  cleanupTrash();
  if (data && Array.isArray(data.notes)) setTimeout(() => window.api.cleanupFiles(referencedFiles()), 5000);
  window.api.setTheme(state.settings.theme);
  bindEvents();
  applyBackground();
  updateGridWidth();
  renderAll();
  checkReminders();
  setInterval(checkReminders, 15000);
  setInterval(cleanupTrash, 3600e3);
}
init();
