# PDF Merger with AI Summaries

A modern web application for merging PDF files with AI-powered Chinese summary and TOC generation. Built with React, TypeScript, and Vite.

![PDF Merger](https://via.placeholder.com/800x400?text=PDF+Merger)

## Features

- **Drag & Drop Upload** - Easily upload multiple PDF files
- **Drag to Reorder** - Change the order of PDF files with intuitive drag-and-drop
- **AI Chinese Summaries** - Generates Chinese summaries for each PDF using AI
- **AI Chinese TOC** - Automatically generates a Chinese Table of Contents for merged PDFs
- **TOC Preview & Edit** - View and customize the table of contents before merging
- **Auto-rotate** - Automatically rotates pages for better reading

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS
- **PDF Processing**: pdf-lib, pdf.js, fontkit
- **AI Integration**: SiliconFlow API (Qwen2.5-7B-Instruct)
- **Drag & Drop**: @dnd-kit

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/pdf-merger.git
cd pdf-merger

# Install dependencies
npm install

# Start development server
npm run dev
```

### API Key Configuration

This application requires a SiliconFlow API key to enable AI features (Chinese summaries and TOC generation).

1. **Get a free API key**: Visit [SiliconFlow](https://siliconflow.cn) and sign up for a free account
2. **Enter your API key**: In the app, find the "API Key Configuration" panel on the left sidebar
3. **Save**: Click "Save" to store your API key locally (saved to browser localStorage)

Your API key is stored only in your browser and is never sent to our servers.

## Usage

1. **Upload PDFs** - Drag and drop PDF files or click to browse
2. **Configure API Key** - Enter your SiliconFlow API key to enable AI features
3. **Reorder** - Drag files to change their order in the merged document
4. **Generate Summaries** - Click "生成中文摘要" to generate Chinese summaries for each PDF
5. **Generate TOC** - Click "生成中文目录" to create a table of contents
6. **Edit TOC** - Customize the TOC (titles, page numbers) before merging
7. **Merge** - Click "Merge & Download" to create your merged document

## Project Structure

```
pdf-merger/
├── public/
│   └── fonts/
│       └── NotoSansSC-Regular.woff2  # Chinese font for PDF generation
├── src/
│   ├── components/          # React components
│   │   ├── App.tsx
│   │   ├── ApiKeyPanel.tsx # API key input component
│   │   ├── AiSummaryPanel.tsx
│   │   ├── FileUploader.tsx
│   │   ├── FileList.tsx
│   │   └── MergeButton.tsx
│   ├── lib/
│   │   ├── ai.ts           # AI Chinese summarization & TOC generation
│   │   └── pdf-utils.ts    # PDF manipulation with Chinese TOC
│   ├── types/
│   │   └── index.ts        # TypeScript definitions
│   └── index.css           # Tailwind styles
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Building for Production

```bash
# Build the project
npm run build

# Preview production build
npm run preview
```

## API Integration

This project uses SiliconFlow API for:
1. **Chinese Summary Generation** - Creates concise Chinese summaries from PDF content
2. **Chinese TOC Generation** - Automatically generates a table of contents based on summaries

The AI model used is Qwen2.5-7B-Instruct, which provides high-quality Chinese text generation.

## Font License

This project includes Noto Sans SC (Simplified Chinese) font for PDF generation:
- **Font**: Noto Sans SC
- **License**: OFL-1.1 (Open Font License)
- **Source**: https://github.com/googlefonts/noto-cjk

## Privacy & Security

- Your API key is stored only in your browser's localStorage
- The API key is never committed to git or shared with anyone
- All API calls are made directly from your browser to SiliconFlow

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
