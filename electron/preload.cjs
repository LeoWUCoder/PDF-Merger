const { contextBridge, ipcRenderer, shell } = require('electron')

// 安全地暴露 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取应用版本
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // 在文件夹中显示文件
  showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),

  // 平台信息
  platform: process.platform,

  // 打开外部链接
  openExternal: (url) => shell.openExternal(url)
})
