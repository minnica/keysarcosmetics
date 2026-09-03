// Script de preload: expone APIs seguras al renderer mediante contextBridge
import { contextBridge, ipcRenderer } from 'electron'

// API expuesta al renderer bajo window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  posLogin: (input: { alias: string; pin: string }) =>
    ipcRenderer.invoke('pos:login', input),
})
