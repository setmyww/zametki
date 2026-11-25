'use strict';
const {
  app, BrowserWindow, ipcMain, Tray, Menu, Notification, dialog,
  nativeImage, nativeTheme, shell, clipboard,
} = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Размытие рабочего стола (acrylic) доступно в Windows 11 22H2 (сборка 22621) и новее
const winBuild = process.platform === 'win32' ? Number(os.release().split('.')[2] || 0) : 0;
const ACRYLIC_OK = winBuild >= 22621;
const materialFor = (mode) => (ACRYLIC_OK && mode === 'acrylic' ? 'acrylic' : 'none');
const symbolColor = (theme) => (theme === 'light' ? '#1c1c1e' : '#ededef');

const APP_ID = 'com.local.zametki';
const ICON = path.join(__dirname, 'icon.png');
const startHidden = process.argv.includes('--hidden');

let win = null;
let tray = null;
let quitting = false;
let backupDone = false;
const liveNotifications = new Set();

const dataFile = () => path.join(app.getPath('userData'), 'notes.json');
const sysFile = () => path.join(app.getPath('userData'), 'system.json');
const wallFile = () => path.join(app.getPath('userData'), 'wallpaper.txt');

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
}
function saveNotes(data) {
  // Перед первой записью за сеанс сохраняем резервную копию прошлого состояния
  if (!backupDone) {
    backupDone = true;
    try { if (fs.existsSync(dataFile())) fs.copyFileSync(dataFile(), dataFile().replace(/\.json$/, '.backup.json')); } catch {}
  }
  writeJSON(dataFile(), data);
}

let sys = { closeToTray: true, bounds: null, maximized: false, background: ACRYLIC_OK ? 'acrylic' : 'gradient', theme: 'dark' };

function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function rememberBounds() {
  if (!win || win.isDestroyed()) return;
  sys.maximized = win.isMaximized();
  if (!sys.maximized && !win.isMinimized()) sys.bounds = win.getBounds();
  writeJSON(sysFile(), sys);
}

function createWindow() {
  const b = sys.bounds || {};
  win = new BrowserWindow({
    width: b.width || 1200,
    height: b.height || 820,
    x: b.x, y: b.y,
    minWidth: 420,
    minHeight: 420,
    show: false,
    title: 'Заметки',
    icon: ICON,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: symbolColor(sys.theme), height: 44 },
    backgroundColor: '#00000000',
    backgroundMaterial: materialFor(sys.background),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
      spellcheck: true,
    },
  });
  win.webContents.session.setSpellCheckerLanguages(['ru', 'en-US']);
  if (sys.maximized) win.maximize();
  win.loadFile(path.join(__dirname, 'index.html'));
  win.once('ready-to-show', () => { if (!startHidden) win.show(); });

  win.on('close', (e) => {
    rememberBounds();
    if (!quitting && sys.closeToTray) {
      e.preventDefault();
      win.hide();
    }
  });
  win.on('closed', () => { win = null; });

  // Ссылки открываем во внешнем браузере
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    e.preventDefault();
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
  });
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') win.webContents.toggleDevTools();
  });
}

function createTray() {
  const img = nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 });
  tray = new Tray(img);
  tray.setToolTip('Заметки');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Открыть «Заметки»', click: showWindow },
    { label: 'Новая заметка', click: () => { showWindow(); win?.webContents.send('new-note'); } },
    { type: 'separator' },
    { label: 'Выход', click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on('click', showWindow);
}

function autostartOptions() {
  return app.isPackaged
    ? { path: process.execPath, args: ['--hidden'] }
    : { path: process.execPath, args: [app.getAppPath(), '--hidden'] };
}

// ---------- IPC ----------
ipcMain.handle('load', () => readJSON(dataFile(), null));
ipcMain.handle('save', (_e, data) => { saveNotes(data); return true; });
ipcMain.on('save-sync', (e, data) => { try { saveNotes(data); } catch {} e.returnValue = true; });

ipcMain.on('notify', (_e, { id, title, body }) => {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, icon: ICON });
  liveNotifications.add(n);
  n.on('click', () => { showWindow(); win?.webContents.send('open-note', id); });
  n.on('close', () => liveNotifications.delete(n));
  n.show();
});

ipcMain.on('copy-text', (_e, text) => clipboard.writeText(String(text)));

ipcMain.on('set-theme', (_e, theme) => {
  nativeTheme.themeSource = theme === 'light' ? 'light' : 'dark';
  if (sys.theme !== theme) { sys.theme = theme; writeJSON(sysFile(), sys); }
  try { win?.setTitleBarOverlay({ color: '#00000000', symbolColor: symbolColor(theme), height: 44 }); } catch {}
});

ipcMain.on('set-background', (_e, mode) => {
  if (sys.background !== mode) { sys.background = mode; writeJSON(sysFile(), sys); }
  try { win?.setBackgroundMaterial(materialFor(mode)); } catch {}
});
ipcMain.handle('get-wallpaper', () => { try { return fs.readFileSync(wallFile(), 'utf8'); } catch { return null; } });
ipcMain.handle('set-wallpaper', (_e, dataUrl) => {
  if (dataUrl) fs.writeFileSync(wallFile(), String(dataUrl)); else { try { fs.unlinkSync(wallFile()); } catch {} }
  return true;
});

ipcMain.handle('get-sys-settings', () => ({
  acrylicSupported: ACRYLIC_OK,
  closeToTray: sys.closeToTray,
  autostart: app.getLoginItemSettings(autostartOptions()).openAtLogin,
}));
ipcMain.on('set-close-to-tray', (_e, v) => { sys.closeToTray = !!v; writeJSON(sysFile(), sys); });
ipcMain.on('set-autostart', (_e, v) => {
  app.setLoginItemSettings({ openAtLogin: !!v, ...autostartOptions() });
});

ipcMain.handle('export', async (_e, data) => {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const r = await dialog.showSaveDialog(win, {
    title: 'Экспорт заметок',
    defaultPath: path.join(app.getPath('documents'), `zametki-${stamp}.json`),
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (r.canceled || !r.filePath) return false;
  fs.writeFileSync(r.filePath, JSON.stringify(data, null, 2));
  return true;
});

// ---------- Файлы: хранятся копиями в папке данных программы ----------
const filesDir = () => path.join(app.getPath('userData'), 'files');
const safeName = (n) => String(n || 'file').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 120);
const fileId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
function storedPath(stored) {
  const base = path.basename(String(stored || ''));
  if (!base || base !== stored) return null;
  return path.join(filesDir(), base);
}
function fileMeta(id, name, stored, size) {
  return { id, name, size, stored, addedAt: Date.now() };
}
function copyIn(paths) {
  fs.mkdirSync(filesDir(), { recursive: true });
  const out = [];
  for (const p of paths || []) {
    try {
      const st = fs.statSync(p);
      if (!st.isFile()) continue;
      const id = fileId();
      const name = path.basename(p);
      const stored = `${id}-${safeName(name)}`;
      fs.copyFileSync(p, path.join(filesDir(), stored));
      out.push(fileMeta(id, name, stored, st.size));
    } catch {}
  }
  return out;
}
ipcMain.handle('pick-files', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Добавить файлы', properties: ['openFile', 'multiSelections'] });
  return r.canceled ? [] : copyIn(r.filePaths);
});
ipcMain.handle('add-file-paths', (_e, paths) => copyIn(paths));
ipcMain.handle('add-file-data', (_e, { name, data }) => {
  fs.mkdirSync(filesDir(), { recursive: true });
  const id = fileId();
  const stored = `${id}-${safeName(name)}`;
  const buf = Buffer.from(data);
  fs.writeFileSync(path.join(filesDir(), stored), buf);
  return fileMeta(id, String(name || 'file'), stored, buf.length);
});
ipcMain.handle('open-file', async (_e, f) => {
  const p = storedPath(f && f.stored);
  if (!p || !fs.existsSync(p)) return false;
  return (await shell.openPath(p)) === '';
});
ipcMain.handle('show-file', (_e, f) => {
  const p = storedPath(f && f.stored);
  if (!p || !fs.existsSync(p)) return false;
  shell.showItemInFolder(p);
  return true;
});
ipcMain.handle('save-file-as', async (_e, f) => {
  const p = storedPath(f && f.stored);
  if (!p || !fs.existsSync(p)) return false;
  const r = await dialog.showSaveDialog(win, { title: 'Сохранить файл', defaultPath: path.join(app.getPath('downloads'), safeName(f.name)) });
  if (r.canceled || !r.filePath) return null;
  fs.copyFileSync(p, r.filePath);
  return true;
});
// Удаляем только файлы, на которые больше нет ссылок и которые старше суток
ipcMain.handle('cleanup-files', (_e, keepList) => {
  if (!Array.isArray(keepList) || !keepList.length) return 0;
  const keep = new Set(keepList);
  let removed = 0;
  try {
    for (const name of fs.readdirSync(filesDir())) {
      if (keep.has(name)) continue;
      const p = path.join(filesDir(), name);
      const st = fs.statSync(p);
      if (st.isFile() && Date.now() - st.mtimeMs > 24 * 3600e3) { fs.unlinkSync(p); removed++; }
    }
  } catch {}
  return removed;
});

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };

ipcMain.handle('import', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Импорт заметок (файл экспорта или JSON-файлы Google Keep из Google Takeout)',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (r.canceled) return null;
  const out = [];
  for (const file of r.filePaths) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      const attachments = {};
      if (Array.isArray(data.attachments)) {
        for (const a of data.attachments) {
          if (!a || !a.filePath) continue;
          const base = path.basename(String(a.filePath));
          const candidates = [base, base.replace(/\.jpeg$/i, '.jpg'), base.replace(/\.jpg$/i, '.jpeg')];
          for (const c of candidates) {
            const p = path.join(path.dirname(file), c);
            if (fs.existsSync(p)) {
              const mime = MIME[path.extname(p).toLowerCase()];
              if (mime) attachments[a.filePath] = `data:${mime};base64,${fs.readFileSync(p).toString('base64')}`;
              break;
            }
          }
        }
      }
      out.push({ name: path.basename(file), data, attachments });
    } catch (err) {
      out.push({ name: path.basename(file), error: String(err && err.message) });
    }
  }
  return out;
});

// ---------- Жизненный цикл ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showWindow);
  app.setAppUserModelId(app.isPackaged ? APP_ID : process.execPath);
  app.whenReady().then(() => {
    sys = { ...sys, ...readJSON(sysFile(), {}) };
    nativeTheme.themeSource = sys.theme === 'light' ? 'light' : 'dark';
    Menu.setApplicationMenu(null);
    createWindow();
    createTray();
  });
  app.on('before-quit', () => { quitting = true; rememberBounds(); });
  app.on('window-all-closed', () => app.quit());
}
