import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import axios from 'axios'
import SettingsPanel from './SettingsPanel'
import Message, { type ChatMessage } from './components/Message'
import './App.css'

const DEFAULT_PROMPT = '你是一个陪我聊天的朋友，请用中文回答我的问题，且每次回答的内容不要超过100字'
const STORAGE_KEY = 'ai-chat-api-key'
const STORAGE_API_URL = 'ai-chat-api-url'
// const DEFAULT_API_URL = 'http://10.74.41.111:8000/v1/chat/completions'
// const DEFAULT_API_URL = 'https://api.cloudflareai.com/v1/chat/completions'
const DEFAULT_API_URL = 'https://wetly-uncaricatured-nancie.ngrok-free.dev/v1/chat/completions'

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`

async function fetchCompletion(
  history: ChatMessage[],
  options: { apiKey: string; model: string; systemPrompt: string; apiUrl?: string }
) {
  const { apiKey, model, systemPrompt, apiUrl = DEFAULT_API_URL } = options

  if (!apiKey) {
    throw new Error('请先填写 OpenAI API Key。')
  }

  const payload = {
    model,
    temperature: 0.7,
    systemPrompt,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history.map(({ role, content }) => ({ role, content })),
    ],
  }

  try {
    const response = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    })

    const reply = response.data?.choices?.[0]?.message?.content?.trim()

    if (!reply) {
      throw new Error('模型未返回内容，请稍后再试。')
    }

    return reply
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.error?.message ??
        `请求失败：${error.response?.status} ${error.response?.statusText ?? error.message}`
      throw new Error(message)
    }
    throw error instanceof Error ? error : new Error('未知错误，请稍后再试。')
  }
}

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL)
  const [model, setModel] = useState('qwen3')
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT)
  const [loading, setLoading] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  useEffect(() => {
    const storedKey = localStorage.getItem(STORAGE_KEY)
    if (storedKey) {
      setApiKey(storedKey)
    }
    const storedUrl = localStorage.getItem(STORAGE_API_URL)
    if (storedUrl) {
      setApiUrl(storedUrl)
    }
  }, [])

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem(STORAGE_KEY, apiKey)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [apiKey])

  useEffect(() => {
    if (apiUrl && apiUrl !== DEFAULT_API_URL) {
      localStorage.setItem(STORAGE_API_URL, apiUrl)
    } else {
      localStorage.removeItem(STORAGE_API_URL)
    }
  }, [apiUrl])

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
        apiUrl,
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
    setMessages([])
  }

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      // 可以添加一个提示，但这里先简单处理
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  const deleteMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">AI Chat</p>
          <h1>智能陪聊</h1>
          <p className="subtitle">
            陪你聊天，陪你解闷，陪你度过无聊的时光，还能帮你做做小任务。
          </p>
        </div>
        <div className="header-actions">
          <button className="ghost" onClick={clearHistory}>
            清空对话
          </button>
          <button className="ghost settings-btn" onClick={() => setIsSettingsOpen(true)}>
            设置
          </button>
        </div>
      </header>

      <div className="app-content">
        <section className="chat-panel">
          <div className="message-list">
            {messages.map((message) => (
              <Message
                key={message.id}
                message={message}
                onCopy={copyMessage}
                onDelete={deleteMessage}
              />
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
      </div>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiUrl={apiUrl}
        onApiUrlChange={setApiUrl}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        model={model}
        onModelChange={setModel}
        systemPrompt={systemPrompt}
        onSystemPromptChange={setSystemPrompt}
      />
    </div>
  )
}

export default App

