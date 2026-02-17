# PDF Merger - AI 智能 PDF 合并工具

一个现代化的 Web 应用，支持 PDF 文件合并和 AI 智能摘要生成。基于 React、TypeScript 和 Vite 构建。

![PDF Merger](https://via.placeholder.com/800x400?text=PDF+Merger+Screenshot)

## 功能特性

- **拖拽上传** - 轻松上传多个 PDF 文件
- **拖拽排序** - 通过直观的拖拽操作调整 PDF 顺序
- **AI 文件名翻译** - 自动将中文文件名翻译为英文
- **AI 摘要生成** - 使用 AI 为每个 PDF 生成英文摘要
- **摘要页** - 在合并 PDF 开头创建多页摘要
- **自动旋转** - 自动旋转页面以获得更好的阅读体验

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **样式方案**: Tailwind CSS
- **PDF 处理**: pdf-lib, pdf.js
- **AI 集成**: SiliconFlow API (Qwen2.5-7B-Instruct)
- **拖拽组件**: @dnd-kit

## 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/你的用户名/pdf-merger.git
cd pdf-merger

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### API Key 配置

本应用需要 SiliconFlow API Key 才能启用 AI 功能（翻译和摘要生成）。

1. **获取免费 API Key**: 访问 [SiliconFlow](https://siliconflow.cn) 注册免费账号
2. **输入 API Key**: 在应用左侧边栏找到"API Key Configuration"面板
3. **保存**: 点击"Save"将 API Key 保存到浏览器本地存储

您的 API Key 仅存储在浏览器中，不会发送到我们的服务器。

## 使用方法

1. **上传 PDF** - 拖拽 PDF 文件或点击浏览选择
2. **配置 API Key** - 输入您的 SiliconFlow API Key 以启用 AI 功能
3. **调整顺序** - 拖拽文件以更改合并后的顺序
4. **生成摘要** - 点击"AI 摘要"翻译文件名并生成摘要
5. **合并 PDF** - 点击"合并 PDF"创建合并文档

## 项目结构

```
pdf-merger/
├── src/
│   ├── components/          # React 组件
│   │   ├── App.tsx
│   │   ├── ApiKeyPanel.tsx # API Key 输入组件
│   │   ├── FileUploader.tsx
│   │   ├── FileList.tsx
│   │   └── MergeButton.tsx
│   ├── lib/
│   │   ├── ai.ts           # AI 翻译和摘要
│   │   └── pdf-utils.ts    # PDF 处理工具
│   ├── types/
│   │   └── index.ts        # TypeScript 类型定义
│   └── index.css           # Tailwind 样式
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
1. **文件名翻译** - 中文转英文
2. **摘要生成** - 创建简洁的英文摘要

使用的 AI 模型是 Qwen2.5-7B-Instruct，提供高质量的翻译和摘要。

## 隐私与安全

- 您的 API Key 仅存储在浏览器的 localStorage 中
- API Key 不会被提交到 git 或分享给任何人
- 所有 API 调用直接从您的浏览器发送到 SiliconFlow

## 开源许可

MIT License - 详见 [LICENSE](LICENSE) 文件。

## 贡献

欢迎贡献代码！请随时提交 Pull Request。
