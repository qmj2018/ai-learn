# AI Chat (React + Vite)

一个基于 React + Vite 实现的轻量级 AI 聊天界面，可直接调用 OpenAI Chat Completions API，支持自定义模型、系统提示词以及本地保存 API Key。

## 功能亮点

- 🎯 纯前端聊天体验：输入/回复即时显示，支持 Enter 发送、Shift+Enter 换行。
- ⚙️ 可调参数：自由切换模型、系统提示词，方便不同场景调优。
- 🔐 Key 本地持久化：API Key 仅存储在浏览器 localStorage，对外不泄露。
- 🧹 对话管理：一键清空历史，快速开启新话题。

## 使用方式

```bash
cd ai-chat
npm install
npm run dev
```

> 环境要求：Node.js 20.19+ 或 22.12+（Vite 7 官方要求），请确保本地版本满足后再执行命令。

启动后在浏览器打开提示的地址（默认 http://localhost:5173），在右侧设置面板里填写你的 `OpenAI API Key` 与想使用的 `model`（默认 `gpt-4o-mini`，可根据账号权限调整），即可开始对话。

> 提示：也可以在根目录的 `.env.local` 中写入 `VITE_OPENAI_API_KEY=xxx`，页面会自动读取并回填到输入框。

## 生产构建

```bash
npm run build
npm run preview
```

## 后续扩展建议

- 接入自建后端或其他推理服务（如 OpenRouter、Moonshot、DeepSeek）。
- 加入消息 Markdown 渲染、代码块复制等增强体验。
- 支持多会话/历史记录持久化与导出。

欢迎继续基于本项目扩展属于你的 AI 聊天助手！
