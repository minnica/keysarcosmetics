// Script de preload: expone APIs seguras al renderer mediante contextBridge
import { contextBridge, ipcRenderer } from 'electron'

// API expuesta al renderer bajo window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  // Placeholder — agregar métodos IPC conforme se desarrolle
  ping: () => ipcRenderer.invoke('ping'),
})
