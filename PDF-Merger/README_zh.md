# PDF 合并工具 - AI 智能摘要与目录

一个现代化的网页应用，用于合并 PDF 文件并使用 AI 生成中文摘要和目录。基于 React、TypeScript 和 Vite 构建。

![PDF Merger](https://via.placeholder.com/800x400?text=PDF+Merger)

## 功能特性

- **拖拽上传** - 轻松上传多个 PDF 文件
- **拖拽排序** - 通过直观的拖拽操作调整 PDF 文件顺序
- **AI 中文摘要** - 使用 AI 为每个 PDF 生成中文摘要
- **AI 中文目录** - 自动为合并后的 PDF 生成中文目录
- **目录预览与编辑** - 合并前查看和自定义目录
- **自动旋转** - 自动旋转页面以获得更好的阅读体验

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **样式方案**: Tailwind CSS
- **PDF 处理**: pdf-lib, pdf.js, fontkit
- **AI 集成**: SiliconFlow API (Qwen2.5-7B-Instruct)
- **拖拽组件**: @dnd-kit

## 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/pdf-merger.git
cd pdf-merger

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### API 密钥配置

此应用需要 SiliconFlow API 密钥来启用 AI 功能（中文摘要和目录生成）。

1. **获取免费 API 密钥**: 访问 [SiliconFlow](https://siliconflow.cn) 注册免费账号
2. **输入 API 密钥**: 在应用中，找到左侧边栏的"API Key Configuration"面板
3. **保存**: 点击"Save"将密钥保存到本地（保存在浏览器 localStorage 中）

您的 API 密钥仅保存在浏览器中，绝不会发送到我们的服务器。

## 使用方法

1. **上传 PDF** - 拖拽 PDF 文件或点击浏览选择
2. **配置 API 密钥** - 输入 SiliconFlow API 密钥以启用 AI 功能
3. **调整顺序** - 拖拽文件以更改合并后的顺序
4. **生成摘要** - 点击"生成中文摘要"为每个 PDF 生成中文摘要
5. **生成目录** - 点击"生成中文目录"创建目录
6. **编辑目录** - 合并前自定义目录（标题、页码）
7. **合并下载** - 点击"Merge & Download"生成合并后的 PDF

## 项目结构

```
pdf-merger/
├── public/
│   └── fonts/
│       └── NotoSansSC-Regular.woff2  # PDF 中文目录字体
├── src/
│   ├── components/          # React 组件
│   │   ├── App.tsx
│   │   ├── ApiKeyPanel.tsx # API 密钥输入组件
│   │   ├── AiSummaryPanel.tsx
│   │   ├── FileUploader.tsx
│   │   ├── FileList.tsx
│   │   └── MergeButton.tsx
│   ├── lib/
│   │   ├── ai.ts           # AI 中文摘要与目录生成
│   │   └── pdf-utils.ts    # PDF 处理与中文目录生成
│   ├── types/
│   │   └── index.ts        # TypeScript 类型定义
│   └── index.css          # Tailwind 样式
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 构建生产版本

```bash
# 构建项目
npm run build

# 预览生产构建
npm run preview
```

## API 集成

本项目使用 SiliconFlow API 实现：
1. **中文摘要生成** - 从 PDF 内容生成简洁的中文摘要
2. **中文目录生成** - 基于摘要自动生成目录

使用的 AI 模型是 Qwen2.5-7B-Instruct，能够生成高质量的中文文本。

## 字体授权

本项目包含 Noto Sans SC（简体中文）字体用于 PDF 目录生成：
- **字体**: Noto Sans SC
- **授权**: OFL-1.1（开放字体授权）
- **来源**: https://github.com/googlefonts/noto-cjk

## 隐私与安全

- 您的 API 密钥仅保存在浏览器的 localStorage 中
- API 密钥绝不会提交到 git 或与他人分享
- 所有 API 调用直接从浏览器发送到 SiliconFlow

## 开源协议

MIT License - 详情请参阅 [LICENSE](LICENSE) 文件。

## 贡献

欢迎贡献！请随时提交 Pull Request。
