// Script de preload: expone APIs seguras al renderer mediante contextBridge
import { contextBridge, ipcRenderer } from 'electron'
import type { PosOfflineOperationKind } from '@cosmetics/types'

// API expuesta al renderer bajo window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  posLogin: (input: { alias: string; pin: string }) =>
    ipcRenderer.invoke('pos:login', input),
  posOfflineEnqueue: (input: {
    kind: PosOfflineOperationKind
    entityId?: string | null
    dependsOn?: string[]
    payload: Record<string, unknown>
    createdAt?: string
  }) => ipcRenderer.invoke('pos:offline:enqueue', input),
  posOfflineStatus: () => ipcRenderer.invoke('pos:offline:status'),
  posOfflineAuthorize: (pin: string) =>
    ipcRenderer.invoke('pos:offline:authorize', pin),
  posOfflineSync: () => ipcRenderer.invoke('pos:offline:sync'),
  posOfflineLogout: () => ipcRenderer.invoke('pos:offline:logout'),
})
