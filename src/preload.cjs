'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const on = (channel, callback) => {
  const listener = (event, value) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};
contextBridge.exposeInMainWorld('studio', {
  toggleReceiver: () => ipcRenderer.invoke('receiver:toggle'),
  setQuality: value => ipcRenderer.invoke('receiver:quality', value),
  stopReceiver: () => ipcRenderer.invoke('receiver:stop'),
  receiverStatus: () => ipcRenderer.invoke('receiver:status'),
  onReceiverStatus: callback => on('receiver:status', callback),
  readClipboard: () => ipcRenderer.invoke('clipboard:read'),
  toggleFullscreen: () => ipcRenderer.invoke('window:fullscreen'),
  setAlwaysOnTop: value => ipcRenderer.invoke('window:always-on-top', value),
  onFullscreen: callback => on('window:fullscreen', callback),
  detachText: () => ipcRenderer.invoke('window:detach-text'),
  getSession: () => ipcRenderer.invoke('session:get'),
  updateSession: value => ipcRenderer.send('session:update', value),
  onSession: callback => on('session:update', callback),
  command: value => ipcRenderer.send('session:command', value),
  onCommand: callback => on('session:command', callback)
});
