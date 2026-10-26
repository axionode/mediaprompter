'use strict';
const { app, BrowserWindow, ipcMain, clipboard, session, Menu, powerSaveBlocker } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { Receiver } = require('./receiver.cjs');
const root = path.resolve(__dirname, '..');
app.setName('Mediaprompter');
fs.mkdirSync(path.join(root, 'work', 'session'), { recursive: true });
app.setPath('userData', path.join(root, 'work', 'session'));
app.setPath('crashDumps', path.join(root, 'work', 'crashdumps'));
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
const hasLock = app.requestSingleInstanceLock(); if (!hasLock) app.quit();
app.on('second-instance', () => { if (main) { if (main.isMinimized()) main.restore(); main.show(); main.focus(); } });
let main, textWindow, receiver, current = null, sleepBlocker;
function senderAllowed(event) { return BrowserWindow.getAllWindows().some(w => w.webContents === event.sender); }
function publish(channel, value, except) {
  for (const win of BrowserWindow.getAllWindows()) if (!win.isDestroyed() && win.webContents !== except) win.webContents.send(channel, value);
}
function windowOptions(extra) {
  return { width: 1440, height: 930, minWidth: 760, minHeight: 520, backgroundColor: '#101215', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false,
      sandbox: true, partition: 'mediaprompter-session', backgroundThrottling: false, spellcheck: false }, ...extra };
}
function secureWindow(win) {
  win.on('enter-full-screen', () => win.webContents.send('window:fullscreen', true));
  win.on('leave-full-screen', () => win.webContents.send('window:fullscreen', false));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
}
app.whenReady().then(() => {
  if (!hasLock) return;
  Menu.setApplicationMenu(null);
  const ses = session.fromPartition('mediaprompter-session', { cache: false });
  ses.setPermissionRequestHandler((wc, permission, callback) => callback(false));
  ses.setPermissionCheckHandler(() => false);
  ses.on('will-download', e => e.preventDefault());
  receiver = new Receiver(root);
  receiver.on('status', value => publish('receiver:status', value));
  main = new BrowserWindow(windowOptions());
  main.once('ready-to-show', () => { main.show(); }); secureWindow(main); main.loadFile(path.join(__dirname, 'index.html'));
  main.on('closed', () => app.quit());
  ipcMain.handle('receiver:toggle', async event => {
    if (!senderAllowed(event)) throw new Error('Invalid sender');
    try { return receiver.stopped ? await receiver.start() : receiver.stop(); }
    catch (e) { receiver.stop(); receiver.update({ state: 'error', message: e.message }); return receiver.status; }
  });
  ipcMain.handle('receiver:quality', (event, value) => senderAllowed(event) ? receiver.setQuality(value) : null);
  ipcMain.handle('receiver:stop', event => senderAllowed(event) ? receiver.stop() : null);
  ipcMain.handle('receiver:status', event => senderAllowed(event) ? receiver.status : null);
  ipcMain.handle('clipboard:read', event => senderAllowed(event) ? clipboard.readText() : '');
  ipcMain.handle('window:fullscreen', event => {
    if (!senderAllowed(event)) return false;
    const win = BrowserWindow.fromWebContents(event.sender);
    win.setFullScreen(!win.isFullScreen()); return win.isFullScreen();
  });
  ipcMain.handle('window:always-on-top', (event, value) => {
    if (senderAllowed(event)) BrowserWindow.fromWebContents(event.sender).setAlwaysOnTop(Boolean(value));
  });
  ipcMain.handle('session:get', event => senderAllowed(event) ? current : null);
  ipcMain.on('session:update', (event, value) => {
    if (!senderAllowed(event) || event.sender !== main.webContents) return;
    current = value; publish('session:update', current, event.sender);
    if (current.playing && sleepBlocker === undefined) sleepBlocker = powerSaveBlocker.start('prevent-display-sleep');
    if (!current.playing && sleepBlocker !== undefined) { powerSaveBlocker.stop(sleepBlocker); sleepBlocker = undefined; }
  });
  ipcMain.on('session:command', (event, value) => {
    if (senderAllowed(event) && main && !main.isDestroyed()) main.webContents.send('session:command', value);
  });
  ipcMain.handle('window:detach-text', event => {
    if (!senderAllowed(event)) return;
    if (textWindow && !textWindow.isDestroyed()) { textWindow.focus(); return; }
    textWindow = new BrowserWindow(windowOptions({ width: 640, height: 500, minWidth: 180, minHeight: 100,
      title: 'Текст — Mediaprompter', alwaysOnTop: true }));
    secureWindow(textWindow);
    textWindow.loadFile(path.join(__dirname, 'popout.html'));
    textWindow.on('closed', () => { textWindow = null; });
  });
});
app.on('before-quit', () => {
  if (receiver) receiver.stop();
  current = null;
  if (sleepBlocker !== undefined) powerSaveBlocker.stop(sleepBlocker);
});
app.on('window-all-closed', () => app.quit());
