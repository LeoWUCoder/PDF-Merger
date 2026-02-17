const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron')
const path = require('path')

let mainWindow

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'PDF 智能合并工具',
    icon: path.join(__dirname, '../public/vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    autoHideMenuBar: false,
    backgroundColor: '#ffffff'
  })

  // 加载应用
  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`
  mainWindow.loadURL(startUrl)

  // 开发模式下打开开发者工具
  if (process.env.ELECTRON_START_URL) {
    mainWindow.webContents.openDevTools()
  }

  // 处理窗口关闭
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 创建应用菜单
function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        { label: '新建合并任务', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.reload() },
        { type: 'separator' },
        { label: '退出', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: '查看',
      submenu: [
        { label: '刷新', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
        { type: 'separator' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '开发者工具', accelerator: 'CmdOrCtrl+Shift+I', click: () => mainWindow?.webContents.openDevTools() }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '使用说明',
          click: async () => {
            await shell.openExternal('https://github.com/yourusername/pdf-merger#readme')
          }
        },
        { type: 'separator' },
        {
          label: '关于',
          click: () => {
            const { dialog } = require('electron')
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于 PDF 智能合并工具',
              message: 'PDF 智能合并工具',
              detail: '版本 1.0.0\n\n一个智能的 PDF 合并工具，支持拖拽排序、AI 总结、OCR 文字识别等功能。'
            })
          }
        }
      ]
    }
  ]

  // macOS 适配
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { label: '关于', role: 'about' },
        { type: 'separator' },
        { label: '隐藏', role: 'hide' },
        { label: '隐藏其他', role: 'hideOtherApplications' },
        { label: '显示全部', role: 'unhide' },
        { type: 'separator' },
        { label: '退出', role: 'quit' }
      ]
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// 应用准备就绪
app.whenReady().then(() => {
  createWindow()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 处理渲染进程消息
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('show-item-in-folder', (event, filePath) => {
  shell.showItemInFolder(filePath)
})
