import LoadingAnimation from '../LoadingAnimation'
import MarkdownContent from '../MarkdownContent'

export type Role = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: Role
  content: string
  createdAt: number
  status?: 'loading' | 'error'
  errorText?: string
}

interface MessageProps {
  message: ChatMessage
  onCopy: (content: string) => void
  onDelete: (messageId: string) => void
  onRetry?: (messageId: string) => void
}

export default function Message({ message, onCopy, onDelete, onRetry }: MessageProps) {
  const handleCopy = () => {
    onCopy(message.content)
  }

  const handleDelete = () => {
    onDelete(message.id)
  }

  const handleRetry = () => {
    if (onRetry) {
      onRetry(message.id)
    }
  }

  return (
    <article
      className={`message ${message.role} ${
        message.status === 'error' ? 'error' : ''
      } ${message.status === 'loading' ? 'status-loading' : ''}`}
    >
      <div className="message-meta">
        <div className="message-meta-left">
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
        <div className="message-actions">
          {message.status === 'error' && onRetry && (
            <button
              className="message-action-btn retry-btn"
              onClick={handleRetry}
              aria-label="重试"
            >
              🔄
              <span className="tooltip">重试</span>
            </button>
          )}
          <button
            className="message-action-btn copy-btn"
            onClick={handleCopy}
            aria-label="复制消息"
          >
            📋
            <span className="tooltip">复制</span>
          </button>
          <button
            className="message-action-btn delete-btn"
            onClick={handleDelete}
            aria-label="删除消息"
          >
            🗑️
            <span className="tooltip">删除</span>
          </button>
        </div>
      </div>
      <div className="message-content">
        {message.status === 'loading' ? (
          <>
            <span>{message.content}</span>
            <LoadingAnimation />
          </>
        ) : message.role === 'assistant' ? (
          <MarkdownContent content={message.content} />
        ) : (
          <p>{message.content}</p>
        )}
      </div>
      {message.errorText && (
        <p className="message-error">原因：{message.errorText}</p>
      )}
    </article>
  )
}

