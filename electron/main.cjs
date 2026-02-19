const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

// 获取应用根目录
function getAppPath() {
  if (app.isPackaged) {
    // 打包后的应用 - 资源在 asar 中
    // __dirname 在 asar 中指向 app.asar 内部
    return path.join(__dirname, '..')
  }
  // 开发模式
  return path.join(__dirname, '..')
}

let mainWindow
let serverProcess = null

// 启动后端转换服务
function startConverterServer() {
  const appPath = getAppPath()

  // 查找服务器入口文件
  const serverPath = path.join(appPath, 'server', 'index.ts')

  // 使用 tsx 或 ts-node 运行 TypeScript 服务器
  // 或者使用编译后的 JavaScript
  let serverCmd = 'npx'
  let serverArgs = ['tsx', serverPath]

  // 如果在开发模式下运行
  if (process.env.ELECTRON_START_URL) {
    console.log('开发模式: 转换服务需要在独立终端启动')
    console.log(`运行: cd server && npm run dev`)
    return
  }

  // 打包后的模式
  try {
    serverProcess = spawn(serverCmd, serverArgs, {
      env: { ...process.env, PORT: 3001 },
      stdio: 'pipe'
    })

    serverProcess.stdout.on('data', (data) => {
      console.log(`[转换服务] ${data}`)
    })

    serverProcess.stderr.on('data', (data) => {
      console.error(`[转换服务错误] ${data}`)
    })

    serverProcess.on('error', (error) => {
      console.error('[转换服务启动失败]', error)
    })

    serverProcess.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.log(`[转换服务退出] 退出码: ${code}`)
      }
    })
  } catch (error) {
    console.error('启动转换服务失败:', error)
  }
}

function createWindow() {
  const appPath = getAppPath()

  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'PDF 智能合并工具',
    icon: path.join(appPath, 'public/icon.ico'),
    webPreferences: {
      preload: path.join(appPath, 'electron/preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    autoHideMenuBar: false,
    backgroundColor: '#ffffff'
  })

  // 加载应用 - 使用 file:// 协议
  const indexPath = path.join(appPath, 'dist/index.html')
  const indexUrl = `file://${indexPath.replace(/\\/g, '/')}`
  console.log('Loading index from:', indexUrl)

  if (process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL)
  } else {
    mainWindow.loadURL(indexUrl)
  }

  // 监听页面加载错误
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
  })

  mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log('Console:', message)
  })

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
  startConverterServer()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时退出
app.on('window-all-closed', () => {
  // 关闭服务器进程
  if (serverProcess) {
    serverProcess.kill()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出时关闭服务器
app.on('will-quit', () => {
  if (serverProcess) {
    serverProcess.kill()
  }
})

// 处理渲染进程消息
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('show-item-in-folder', (event, filePath) => {
  shell.showItemInFolder(filePath)
})
