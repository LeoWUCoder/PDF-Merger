# PDF 智能合并工具

一个现代化的桌面应用，用于 PDF 处理和文献辅助工具。基于 React、TypeScript、Electron 和 Vite 构建。

## 功能特性

### PDF 合并
- **拖拽上传** - 轻松上传多个 PDF 文件
- **拖拽排序** - 通过直观的拖拽操作调整 PDF 文件顺序
- **AI 中文摘要** - 使用 AI 为每个 PDF 生成中文摘要
- **AI 中文目录** - 自动为合并后的 PDF 生成中文目录
- **目录预览与编辑** - 合并前查看和自定义目录
- **自动旋转** - 自动旋转页面以获得更好的阅读体验

### 公式识别
- **图片转 LaTeX** - 上传数学公式图片，自动识别为 MathType 格式
- **多模型支持** - 支持多种视觉模型（Qwen-VL、LLaVA 等）
- **一键复制** - 识别结果可直接复制到 MathType 或支持 LaTeX 的编辑器

### 参考文献格式化
- **DOI 链接输入** - 输入 DOI 链接自动获取文献信息
- **粘贴格式化** - 直接粘贴参考文献内容，AI 自动识别并格式化
- **多格式支持** - 支持 APA、MLA、Harvard、GB/T 7714、Chicago、Nature、IEEE 等 7 种常用格式
- **一键复制/下载** - 生成结果可复制或下载为 txt 文件

### 图片文字提取
- **拖拽上传** - 拖拽图片进行文字识别
- **Ctrl+V 粘贴** - 直接粘贴截图，解放双手
- **多格式输出** - 支持 Markdown、TXT、纯文字三种格式
- **批量处理** - 同时处理多张图片

## 安装方式

### Windows（推荐）
1. 下载 `PDF 智能合并工具 Setup.exe` 安装包
2. 双击运行安装程序
3. 按提示完成安装
4. 从桌面或开始菜单启动应用

### 开发模式
```bash
# 克隆仓库
git clone https://github.com/yourusername/pdf-merger.git
cd pdf-merger

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## API 密钥配置

此应用需要 SiliconFlow API 密钥来启用所有 AI 功能：

1. **获取免费 API 密钥**: 访问 [SiliconFlow](https://siliconflow.cn) 注册免费账号
2. **输入 API 密钥**: 在应用中，找到底部的"API Key Configuration"面板
3. **保存**: 点击"Save"将密钥保存到本地

**AI 功能列表**：
- PDF 中文摘要生成
- PDF 中文目录生成
- 公式图片识别（LaTeX）
- 参考文献格式化（APA/MLA/GB-T 等）
- 图片文字提取（Markdown/TXT）

您的 API 密钥仅保存在本地存储中，绝不会发送到我们的服务器。

## 技术栈

- **前端框架**: React 18 + TypeScript
- **桌面框架**: Electron 28
- **构建工具**: Vite 5
- **样式方案**: Tailwind CSS
- **PDF 处理**: pdf-lib, pdf.js, fontkit
- **AI 集成**: SiliconFlow API
- **拖拽组件**: @dnd-kit

## 项目结构

```
pdf-merger/
├── electron/                 # Electron 主进程
│   ├── main.cjs             # 应用入口
│   └── preload.cjs          # 预加载脚本
├── public/
│   └── icon.ico            # 应用图标
├── src/
│   ├── components/          # React 组件
│   │   ├── App.tsx         # 主应用
│   │   ├── ApiKeyPanel.tsx # API 密钥输入
│   │   ├── ReferencePanel.tsx    # 参考文献格式化
│   │   ├── TextExtractPanel.tsx  # 图片文字提取
│   │   ├── FileUploader.tsx
│   │   ├── FileList.tsx
│   │   └── MergeButton.tsx
│   ├── lib/
│   │   ├── ai.ts           # AI 摘要与目录生成
│   │   ├── converter.ts    # 格式转换与 AI 识别
│   │   └── pdf-utils.ts    # PDF 处理
│   ├── types/
│   │   └── index.ts        # TypeScript 类型
│   └── index.css           # Tailwind 样式
├── server/                  # 后端服务
│   └── index.ts            # Express 服务
├── package.json
└── vite.config.ts
```

## 构建生产版本

```bash
# 仅构建前端
npm run build

# 构建 Electron 安装包
npm run electron:build
```

构建完成后，安装包位于 `release/` 目录。

## API 集成

本项目使用 SiliconFlow API 实现所有 AI 功能：

### 文本模型
- **中文摘要生成** - 从 PDF 内容生成简洁的中文摘要
- **中文目录生成** - 基于摘要自动生成目录
- **参考文献格式化** - 识别并格式化参考文献

### 视觉模型
- **公式识别** - 识别图片中的数学公式并输出 LaTeX
- **图片文字提取** - 从图片中提取文字并转换为 Markdown/TXT
- **多图识别** - 支持同时处理多张图片

### 支持的模型
| 类型 | 推荐模型 | 用途 |
|------|----------|------|
| 文本 | Qwen2.5-7B-Instruct | 摘要、目录、文献格式化 |
| 视觉 | Qwen3-VL-32B-Instruct | 公式识别、图片文字提取 |
| 视觉 | Qwen2-VL-7B-Instruct | 轻量级视觉识别 |

其他可用模型：DeepSeek-V2、Yi-1.5-9B、LLaVA 等

## 字体授权

本项目包含 Noto Sans SC（简体中文）字体用于 PDF 目录生成：
- **字体**: Noto Sans SC
- **授权**: OFL-1.1（开放字体授权）
- **来源**: https://github.com/googlefonts/noto-cjk

## 隐私与安全

- 您的 API 密钥仅保存在本地存储中
- API 密钥绝不会提交到 git 或与他人分享
- 所有 API 调用直接从您的设备发送到 SiliconFlow

## 开源协议

MIT License - 详情请参阅 [LICENSE](LICENSE) 文件。

## 贡献

欢迎贡献！请随时提交 Pull Request。
