import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import './App.css'

type Role = 'user' | 'assistant'

interface ChatMessage {
  id: string
  role: Role
  content: string
  createdAt: number
  status?: 'loading' | 'error'
  errorText?: string
}

const DEFAULT_PROMPT = 'You are a helpful AI assistant.'
const STORAGE_KEY = 'ai-chat-api-key'

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`

async function fetchCompletion(
  history: ChatMessage[],
  options: { apiKey: string; model: string; systemPrompt: string }
) {
  const { apiKey, model, systemPrompt } = options

  if (!apiKey) {
    throw new Error('请先填写 OpenAI API Key。')
  }

  const payload = {
    model,
    temperature: 0.7,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history.map(({ role, content }) => ({ role, content })),
    ],
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null)
    const message =
      errorPayload?.error?.message ??
      `请求失败：${response.status} ${response.statusText}`
    throw new Error(message)
  }

  const data = await response.json()
  const reply = data.choices?.[0]?.message?.content?.trim()

  if (!reply) {
    throw new Error('模型未返回内容，请稍后再试。')
  }

  return reply
}

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createId(),
      role: 'assistant',
      content: '你好，我是你的 AI 助手，有什么可以帮你的吗？',
      createdAt: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('gpt-4o-mini')
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const storedKey = localStorage.getItem(STORAGE_KEY)
    if (storedKey) {
      setApiKey(storedKey)
    }
  }, [])

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem(STORAGE_KEY, apiKey)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [apiKey])

  const isSendDisabled = useMemo(
    () => loading || !input.trim(),
    [loading, input]
  )

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    await handleSend()
  }

  const handleSend = async () => {
    if (isSendDisabled) return

    const userMessage: ChatMessage = {
      id: createId(),
      role: 'user',
      content: input.trim(),
      createdAt: Date.now(),
    }

    const optimisticHistory = [...messages, userMessage]
    const assistantPlaceholder: ChatMessage = {
      id: createId(),
      role: 'assistant',
      content: '思考中…',
      createdAt: Date.now(),
      status: 'loading',
    }

    setMessages([...optimisticHistory, assistantPlaceholder])
    setInput('')
    setLoading(true)

    try {
      const reply = await fetchCompletion(optimisticHistory, {
        apiKey,
        model,
        systemPrompt,
      })

      setMessages((prev) =>
        prev.map((item) =>
          item.id === assistantPlaceholder.id
            ? { ...item, content: reply, status: undefined, errorText: undefined }
            : item
        )
      )
    } catch (error) {
      setMessages((prev) =>
        prev.map((item) =>
          item.id === assistantPlaceholder.id
            ? {
                ...item,
                content: '请求失败',
                status: 'error',
                errorText:
                  error instanceof Error ? error.message : '未知错误，请稍后再试。',
              }
            : item
        )
      )
    } finally {
      setLoading(false)
    }
  }

  const handleComposerKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const clearHistory = () => {
    setMessages([
      {
        id: createId(),
        role: 'assistant',
        content: '新的对话开始啦，尽管提问吧！',
        createdAt: Date.now(),
      },
    ])
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">AI Chat / React + Vite</p>
          <h1>智能对话助手</h1>
          <p className="subtitle">
            使用 OpenAI Chat Completions 接口，实时获得自然语言回复。支持自定义模型、系统提示词以及本地存储
            API Key。
          </p>
        </div>
        <div className="header-actions">
          <button className="ghost" onClick={clearHistory}>
            清空对话
          </button>
        </div>
      </header>

      <div className="app-grid">
        <section className="chat-panel">
          <div className="message-list">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`message ${message.role} ${
                  message.status === 'error' ? 'error' : ''
                }`}
              >
                <div className="message-meta">
                  <span className="message-role">
                    {message.role === 'user' ? '你' : 'AI'}
                  </span>
                  <time>
                    {new Intl.DateTimeFormat('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(message.createdAt)}
                  </time>
                </div>
                <p className="message-content">
                  {message.content}
                  {message.status === 'loading' && <span className="cursor">█</span>}
                </p>
                {message.errorText && (
                  <p className="message-error">原因：{message.errorText}</p>
                )}
              </article>
            ))}
          </div>

          <form className="composer" onSubmit={handleSubmit}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="输入你的问题，Shift+Enter 换行"
              rows={3}
              onKeyDown={handleComposerKey}
            />
            <button type="submit" disabled={isSendDisabled}>
              {loading ? '发送中…' : '发送'}
            </button>
          </form>
        </section>

        <section className="settings-panel">
          <h2>对话参数</h2>
          <label className="field">
            <span>OpenAI API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk-..."
            />
          </label>

          <label className="field">
            <span>模型名称</span>
            <input
              type="text"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="例如：gpt-4o-mini"
            />
          </label>

          <label className="field">
            <span>系统提示词</span>
            <textarea
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              rows={5}
            />
          </label>
          <p className="tip">
            API Key 仅保存在本地浏览器的 localStorage 中，不会上传到服务器。
          </p>
        </section>
      </div>
    </div>
  )
}

export default App

