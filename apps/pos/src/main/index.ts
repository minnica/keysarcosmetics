// Proceso principal de Electron — punto de entrada
import 'dotenv/config'
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

let mainWindow: BrowserWindow | null = null

ipcMain.handle(
  'pos:login',
  async (_event, input: { alias: string; pin: string }) => {
    const apiUrl = process.env['POS_API_URL'] ?? 'http://localhost:4000'
    const terminalCode = process.env['POS_TERMINAL_CODE']
    const terminalSecret = process.env['POS_TERMINAL_SECRET']
    if (!terminalCode || !terminalSecret) {
      return {
        status: 503,
        body: {
          success: false,
          message: 'Esta terminal todavía no está provisionada.',
          data: null,
        },
      }
    }

    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/pos/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          alias: input.alias,
          pin: input.pin,
          terminalCode,
          terminalSecret,
        }),
      })
      return { status: response.status, body: await response.json() }
    } catch {
      return {
        status: 503,
        body: {
          success: false,
          message: 'No fue posible conectar con la API del POS.',
          data: null,
        },
      }
    }
  },
)

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
