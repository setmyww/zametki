'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  pathForFile: (file) => { try { return webUtils.getPathForFile(file) || ''; } catch { return ''; } },
  pickFiles: () => ipcRenderer.invoke('pick-files'),
  addFilePaths: (paths) => ipcRenderer.invoke('add-file-paths', paths),
  addFileData: (name, mime, data) => ipcRenderer.invoke('add-file-data', { name, mime, data }),
  openFile: (f) => ipcRenderer.invoke('open-file', f),
  showFile: (f) => ipcRenderer.invoke('show-file', f),
  saveFileAs: (f) => ipcRenderer.invoke('save-file-as', f),
  cleanupFiles: (keep) => ipcRenderer.invoke('cleanup-files', keep),
  load: () => ipcRenderer.invoke('load'),
  save: (data) => ipcRenderer.invoke('save', data),
  saveSync: (data) => ipcRenderer.sendSync('save-sync', data),
  notify: (payload) => ipcRenderer.send('notify', payload),
  copyText: (text) => ipcRenderer.send('copy-text', text),
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),
  setBackground: (mode) => ipcRenderer.send('set-background', mode),
  getWallpaper: () => ipcRenderer.invoke('get-wallpaper'),
  setWallpaper: (dataUrl) => ipcRenderer.invoke('set-wallpaper', dataUrl),
  exportData: (data) => ipcRenderer.invoke('export', data),
  importData: () => ipcRenderer.invoke('import'),
  getSysSettings: () => ipcRenderer.invoke('get-sys-settings'),
  setCloseToTray: (v) => ipcRenderer.send('set-close-to-tray', v),
  setAutostart: (v) => ipcRenderer.send('set-autostart', v),
  onOpenNote: (cb) => ipcRenderer.on('open-note', (_e, id) => cb(id)),
  onNewNote: (cb) => ipcRenderer.on('new-note', () => cb()),
});
