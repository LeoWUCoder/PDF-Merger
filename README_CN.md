# PDF 智能合并工具

一个现代化的桌面应用，支持 PDF 文件合并、AI 智能摘要和目录生成。基于 React、TypeScript、Vite 和 Electron 构建。

![PDF Merger](https://via.placeholder.com/800x400?text=PDF+Merger+Screenshot)

## 功能特性

- **拖拽上传** - 轻松上传多个 PDF 文件
- **拖拽排序** - 通过直观的拖拽操作调整 PDF 顺序
- **AI 中文摘要** - 使用 AI 为每个 PDF 生成中文摘要
- **AI 中文目录** - 自动生成合并 PDF 的中文目录
- **目录预览编辑** - 合并前查看和自定义目录
- **自动旋转** - 自动旋转页面以获得更好的阅读体验
- **离线支持** - 下载后可完全离线使用

## 下载使用

### Windows
从 [GitHub Releases](https://github.com/你的用户名/pdf-merger/releases) 下载最新版本：
- `PDF 智能合并工具.exe` - 便携版 (~170MB)，无需安装

### macOS
- `PDF-Merger.dmg` - 磁盘映像

### Linux
- `PDF-Merger.AppImage` - AppImage（无需安装）

## 开发环境

### 环境要求

- Node.js 18+ 和 npm/pnpm
- Git

### 安装运行

```bash
# 克隆仓库
git clone https://github.com/你的用户名/pdf-merger.git
cd pdf-merger

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 作为 Electron 桌面应用运行
npm run electron:dev
```

### 构建生产版本

```bash
# 构建 Web 版本
npm run build

# 构建 Electron 便携版
npm run electron:build
```

构建产物位于 `release/` 目录。

## API Key 配置

本应用需要 SiliconFlow API Key 才能启用 AI 功能（摘要和目录生成）。

1. **获取免费 API Key**: 访问 [SiliconFlow](https://siliconflow.cn) 注册免费账号
2. **输入 API Key**: 在应用左侧边栏找到"API Key 配置"面板
3. **保存**: 点击"保存"将 API Key 保存到本地

您的 API Key 仅存储在本地设备上，不会发送到我们的服务器。

## 使用方法

1. **上传 PDF** - 拖拽 PDF 文件或点击浏览选择
2. **配置 API Key** - 输入您的 SiliconFlow API Key 以启用 AI 功能
3. **调整顺序** - 拖拽文件以更改合并后的顺序
4. **生成摘要** - 点击"生成中文摘要"为每个 PDF 生成中文摘要
5. **生成目录** - 点击"生成中文目录"创建目录
6. **编辑目录** - 合并前自定义目录（标题、页码）
7. **合并下载** - 点击"合并下载"创建合并文档

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **桌面应用**: Electron 28
- **样式方案**: Tailwind CSS
- **PDF 处理**: pdf-lib, pdf.js, fontkit
- **AI 集成**: SiliconFlow API (Qwen2.5-7B-Instruct)
- **拖拽组件**: @dnd-kit
- **OCR**: Tesseract.js

## 项目结构

```
pdf-merger/
├── public/
│   └── fonts/
│       └── NotoSansSC-Regular.woff2  # PDF 中文字体
├── src/
│   ├── components/          # React 组件
│   │   ├── App.tsx
│   │   ├── ApiKeyPanel.tsx # API Key 输入组件
│   │   ├── AiSummaryPanel.tsx
│   │   ├── FileUploader.tsx
│   │   ├── FileList.tsx
│   │   └── MergeButton.tsx
│   ├── lib/
│   │   ├── ai.ts           # AI 中文摘要和目录生成
│   │   ├── pdf-utils.ts    # PDF 处理工具（含中文目录）
│   │   └── ocr.ts          # OCR 文字识别
│   ├── types/
│   │   └── index.ts        # TypeScript 类型定义
│   └── index.css           # Tailwind 样式
├── electron/
│   ├── main.cjs           # Electron 主进程
│   └── preload.cjs        # Electron 预加载脚本
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## API 集成

本项目使用 SiliconFlow API 实现：
1. **中文摘要生成** - 从 PDF 内容创建简洁的中文摘要
2. **中文目录生成** - 基于摘要自动生成目录

使用的 AI 模型是 Qwen2.5-7B-Instruct，提供高质量的中文文本生成。

## 字体许可

本项目包含 Noto Sans SC（思源黑体）字体用于 PDF 生成：
- **字体**: Noto Sans SC
- **许可**: OFL-1.1（开源字体许可）
- **来源**: https://github.com/googlefonts/noto-cjk

## 隐私与安全

- 您的 API Key 仅存储在本地设备上
- API Key 不会被提交到 git 或分享给任何人
- 所有 API 调用直接从您的设备发送到 SiliconFlow
- 不会收集或向第三方服务器发送数据

## 开源许可

MIT License - 详见 [LICENSE](LICENSE) 文件。

## 贡献

欢迎贡献代码！请随时提交 Pull Request。
